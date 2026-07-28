# Status

## Current State

_Living snapshot — edit in place, never append._ Last shipped: **the latest-run playtest batch**
(2026-07-27, Opus) — seven small fixes off the user's run notes: pickup delay 1000 → **400ms**
(and the reason it felt inconsistent — a manual click has always ignored the cooldown entirely),
the **bone knife icon** rotated upright (the only inverted weapon icon of 26), **Duskrunner
deaggro** 620 → **280** (the "really hard to deaggro" lock produced an enemy that never let go at
all), **Mossling knockback** scaled to the fragment it is (300 → 90; it had inherited its parent's
full shove), the upgrade **"▲" replaced by a shared pulsing glow** in all three places it appears,
the Upgrade menu's **stale "Requires a nearby Workbench"** line now clearing live like the crafting
menu's always has, and the **Mythic pick-one cards** now measuring their own wrapped height. Before
that: **the bayou debuff system** (2026-07-26) — four enemy-applied player debuffs (**Root / Disarm
/ Silence / Enfeeble**), the first thing in the game that stops the player *doing* something rather
than only damaging or slowing them, plus its counterplay (an active **dispel**, a passive
**status-resistance** stat, per-item/class **hard immunities**), the **Magic skill repurposed off
weapon damage** onto status resistance, and a **9th relic family (`warding`)**.

**In progress / next.**
- **Not reproduced, needs a screenshot: "class description overlaps class box."** Measured every
  text object on both candidate screens for all five survivors — the picker cards clear their
  borders by 16-74px, the Character menu (K) Class tab by 171-212px. The tightest case (Ashcaller /
  Warden in the picker, 16px) may be what reads as touching. Deliberately not padded on a guess.
- **The next playtest is the important one, and it now carries two changes at once.** (1) Removing
  the Bulwark hit cap was a large lethality jump the user accepted deliberately ("dodging is the
  mechanic"): the Miretyrant goes from 34 to **165** per connect on a 260-HP build, i.e. **2
  connects**. `enemyStats.ts` sized those numbers for a "~450-500 HP endgame pool" that no class
  actually reaches — the cap had been papering over that mismatch and it is now exposed. If 2
  connects reads as unfair rather than demanding, re-sight the four Miretyrant numbers against a
  realistic pool; do NOT bring the cap back. (2) On top of that the bayou now takes control away
  from you, for 5-10s at a time. **All the debuff numbers are first-pass.** The knob to reach for
  first is duration, not the diminishing-returns ladder — the ladder is what makes a swarm survivable
  at all. The Miretyrant's 6s disarm is the single harshest number in the batch and the most likely
  to need pulling back.
- **The Magic skill no longer scales magic weapon damage** (locked with the user: "maybe magic skill
  does something with this instead of magic damage?"). That is deliberately also a Gloam/Ember Brand
  nerf, aligned with the standing "brand + crit insta kills stuff with 0 downside" complaint — but
  it is an untested nerf to a weapon line the user actually plays, so watch it.
- Also open from his dump: the **Mirejaw is deliberately targetable while lurking** at `alpha 0.4`
  (its stated contrast against the Sandmaw), which reads as sniping something invisible at 380px
  bow range — needs a design call, not a fix.
- Older, still open: menu **buttons and tabs are deliberately still flat**, a stouter/gobliny
  gremlin, and the ~19 ambient props needing regeneration as objects before they can animate.

**The debuff system's load-bearing rule is diminishing returns, not duration.** Per-application
length is close to irrelevant against a swarm: four attackers landing a root on their own cadences
produce ~100% uptime no matter how short any single one is. `PlayerDebuffs` therefore runs a per-kind
ladder — 100% → 50% → 25% → **fully immune** inside an 18s window — and that is what makes hard
lockouts safe to ship in a hardcore one-life run. **Terrain is undispellable structurally, not
by a flag**: terrain effects never enter the manager (they are recomputed per frame from
`environmentEffectAt`), so a cleanse cannot reach them and a miasma re-arms poison on the very next
frame. Verified live.

**Durations sit in a 5-10s band, ordered by how much each debuff takes away** (raised from 0.9-6s the
same day — the user: "I think the debuffs aren't long enough"), sized against what resistance
actually delivers: at **Magic 20 + an Uncommon warding relic at Tier 2 the total cut is only 25%**
(10% + 10×1.5), so a debuff sits near its base value for most of a run — the 75% floor is a
very-late-game ceiling, not the norm. Root **5s** (lowest: the only one that stops you *avoiding*
damage) / Disarm **6s** / Silence **6s** / Enfeeble **10s** (highest: it never takes control away, so
it can only be felt by outlasting several swing cycles). `DEBUFF_BASE_MS` records the band as
reference only and is deliberately not read by the enemies, so per-attack numbers stay bespoke while a
deviation stays visible. **The Mirejaw death roll is the one deliberate exception, at 1.2s/tick** —
that attack's entire counterplay is breaking away mid-roll, and a 5s root on tick 1 would pin you
through the whole roll plus ~4s past it, converting an escapable move into a guaranteed 3 ticks and
roughly doubling a *common* enemy's output.

**Two rules worth carrying forward from the previous batch.** (1) **A thrown exception inside the
physics step costs no measurable frame time** — the frame is fast, it just aborts the rest of the
step, so entities don't move that frame. It stutters visibly while a frame-time profiler shows
nothing; don't rule out an exception because the numbers look healthy. (2) **Interchangeability
belongs to the slot GROUP, not to the equip path** (`Equipment.slotAccepts`) — the group model was
written for specials and abilities, where any slot will do, and silently applied that to gear.

**The cursor's three rules live in code, not in the PNG** (`src/ui/cursor.ts`), so redrawing the
art can't silently lose them: a pale 1px rim traced around the silhouette (the art is a dark
gauntlet and it crosses near-black panels, unlit crypts and the night overlay — it would vanish on
all three, and the art's own dark outline stays inside the rim so it has a light edge and a dark
edge at once); the hotspot measured from the art's alpha rather than hardcoded; and the click jab
anchored on that same tip so every frame reports an identical hotspot and clicks can't drift
mid-animation. **There is deliberately no hover variant** — an earlier pass swapped three cursors
off the existing prompt state, and since the bottom-right prompt and the hover outline already say
what's under the pointer, a third signal changing shape was noise.

**The menu-chrome rule: chrome sits BESIDE the rectangle, never replaces it.** A menu's
`add.rectangle` owns its fill, alpha, hit area and — for slots — a stroke encoding state. The art
is therefore a border with a **hollow centre**, drawn **outside** the rectangle's bounds, with
state moved from the stroke onto a **tint**. Each of those three is forced: a nine-slice stretches
its centre (hammered metal smears across a 700x850 panel); the layouts were written against a 1px
stroke, so a real border would sit on top of the inventory's 12px text margin and a 70px slot's
64px icon; and art plus a flat stroke is a double border. `bindFrame` makes a panel's frame follow
its rectangle's position/size/visibility every frame — the station menus re-anchor and resize
theirs on every open, and mirroring that by hand at ~30 sites is how an eleventh menu ends up
leaving a frame floating over the world.

**The Active Effects shape is a rule worth keeping.** A stat is ONE number with its sources
indented under it, never a category per source. Grouping by source is what the old Combat block and
relic list did between them, and it made the reader do the multiplication themselves in two places
that named the same stat differently. The data is assembled in `MainScene.activeEffects()` off the
same helpers combat uses — a panel that re-derives a number will eventually disagree with the game,
and the first cut proved it by looking up a relic channel under the wrong key and printing a
correct total with a missing contribution.

**Three findings from that batch worth carrying forward.** (1) **Skills were mostly inert** — 4 of
11 did anything for a real end-game build, and Light Armor had been capped since level 20 of 100;
it now has a second axis (dash distance), and the Stats tab shows live cap headroom with the
sources, because his actual complaint was visibility, not power. (2) **The score's speed multiplier
was dead** — par was 10 minutes against 70-100 minute runs, so every win scored x1.00; par is 90
now. (3) **A hue-shift recolour cannot mark an elite whose base is already red** — the Sandmaw's
elite was literally the same hue as its base, which is why elites now carry a hue-independent gold
rim.

**Frame budget is healthy again**: median 5.0ms / p95 6.8ms of 16.7ms while sprinting at the
Running-100 ceiling, no frames over 20ms. The cause was 103,082 `Graphics` fill commands
re-tessellated every frame for 72 static zone-floor decals; they are baked textures now. **A
static Graphics is a per-frame cost, not a one-off** — bake anything drawn once, at reduced
resolution if it is large.

**The art migration now covers every surface in the game.** The GROUND was the last piece and
the only non-reversible one — it is generated, not a sprite, so the override layer can't reach
it. It is now real 32px pixel art: `src/ui/GroundDetailUI.ts` keeps a 2304px chunk of stamped
tiles around the player (constant cost at any world size) drawn *over* the existing colour
field, which still owns every biome boundary and POI floor stamp. 10 materials across the three
biomes, 28 tiles. The user's three live notes all landed: real water in the forest creek, a
two-probe dither that softens every material boundary in the world at once, and a 16px stamp
grid carved out of the 32px art so boundaries curve without halving the ground's pixel
resolution. Two new tools came out of it — `check-seam.mjs` (a third of every tiles-pro batch
does not actually tile, invisibly) and `seamless.mjs` (repairs a wrap instead of re-rolling for
one). The `ground_speckle` grain layer is gone: it existed only because the outer world had no
detail.


## Recent Entries

> Older entries in STATUS-archive.md.

### Latest-run playtest batch: pickup delay, deaggro, upgrade glow (2026-07-27, Opus)

No plan file — a fix batch off the user's run notes, triaged by quizzing him on the ambiguous
items first (two of the nine turned out to be things I'd have guessed wrong).

**Shipped, each with a named cause.**

1. **Item pickup delay** — `HARVEST_MAGNET_DELAY_MS` 1000 -> **400**. The 1000 was set last
   batch off the opposite complaint ("I want it to lay on the ground for a sec"), and overshot.
   The *inconsistency* he also reported has a real cause worth recording: **a manual click
   ignores the magnet cooldown entirely**, so clicking a drop is always instant while walking
   over the same drop waited a full second. Audited every `spawnLooseDrop` call site — only the
   two node-harvest sites and kill loot are "earned" drops; the other 16 are player-initiated
   (dropping a stack, a destroyed station, crafting overflow) and correctly keep the longer
   1500ms cooldown, which exists so a dropped stack can't snap straight back into your hands.
   Verified live: a felled tree's drops now report exactly 400ms.
2. **Knife upside down when equipped** — the art, not the code. Every weapon icon is drawn with
   the blade/head at the TOP; `icon_bone_knife.png` was the only one drawn point-down, so the
   held sprite (which draws the icon texture directly) looked wrong. Rotated 180° with
   `art/tools/rotate.mjs`. **Audited all 26 weapon icons** with a top-vs-bottom
   luminance/width probe — the knife was the only inverted one (the pickaxe is head-down by
   design and already has its `tiltMirrored` special case).
3. **Duskrunners never deaggroing** — `DEAGGRO_RADIUS` 620 -> **280** (its pre-badlands value).
   620 came from a locked "really hard to deaggro" request, but at chase speed 92 — near the
   player's walk — "lets go most of a screen away" means never lets go: they stayed glued
   across the badlands and followed into other biomes. 280 puts it back with the rest of the
   melee roster (Boar 230, Cragscale 240) while its speed still makes breaking away cost a
   sprint or a dash. Verified: drops aggro at 400px, holds at 200px.
4. **Mossling knockback** — a Mosswretch spawnling had HP, damage, scale and speed all
   re-sized for a fragment but inherited the parent's **full 300 shove**, and three of them
   land it on overlapping beats. Now a per-instance copy of the swing config at 0.3x (**90**);
   the full husk is untouched at 300. A per-instance config rather than a second module const
   so the two can't drift.
5. **Upgrade indicator** — the gold **"▲"** is gone from all three places it appeared
   (inventory slot, hotbar slot, placed station) in favour of a pulsing gold glow, now shared
   from `src/ui/upgradeGlow.ts` so the signal is identical everywhere and re-tunable in one
   place. In slots it sits UNDER the item icon so the slot lights up around the art; on a
   station it draws over at a dimmer peak, because **placed station images carry no depth of
   their own** (they're added at depth 0), so there is no "just behind it" slot that isn't
   also under the ground layers.
6. **Upgrade menu's stale "Requires a nearby Workbench"** — `CraftingMenu` has always
   re-rendered on a proximity flip; `UpgradeMenu` never did, so the warning stuck until you
   closed and reopened it. Both now hang off the same per-frame check. Verified live: the line
   clears the moment you step into range.
7. **Mythic pick-one description running past the menu** — the candidate card's effect text had
   no wrap width, and `CARD_H` was a fixed 54. Wrapping alone would have pushed the overflow
   into the card below, so each card now **measures its own wrapped effect line** and grows,
   with the panel height computed from the same measure pass. Verified with the longest effect
   string in the game (101 chars): it wraps to 2 lines, its card grows 57 -> 69px, and content
   stays inside the card and the panel.

**Not reproduced: "class description overlaps class box."** Measured every text object against
its container on both candidate screens, for all five survivors: the run-start picker cards
clear by 16-74px and the Character menu (K) Class tab by 171-212px. The tightest case — the
Ashcaller/Warden cards in the picker — sits 16px above its border, which at a glance reads as
touching, so that may be what he saw. Left alone rather than padded speculatively; needs a
screenshot.

**The hint he flagged was `totem_ready`**, and on his own follow-up it did clear — the card
holds 8s then fades over 1.4s, which was itself raised from a "tips vanish too fast" complaint.
No change; noted in case it comes up again.

`tsc` clean, zero console errors, everything above verified live in the browser preview.

### Bayou debuff system (2026-07-26, Opus)

Plan: `.claude/plans/bayou-debuff-system.md`. The item deferred out of the Ashcaller batch, built as
its own session because **no player-side debuff state existed at all** — the game had DoTs
(`Bleed`/`Poison`) and terrain conditionals, but nothing that could stop the player acting.

**Four forks were locked with the user before any code** (`AskUserQuestion` + two follow-ups):
the roster is Root/Disarm/Silence/Enfeeble with **Sap cut** ("i'm not sure I like sap"); counterplay
is **both** an active dispel and a passive resistance, **plus** per-item flags that read "Cannot be
Enfeebled"; resistance lives in **three** places — the existing equipment passive, a **relic
family**, and a **skill**, specifically Magic *"instead of magic damage"*; and the dispel clears
**control + DoTs but never terrain**. He then added two display asks mid-session: on-player FX, and
bigger status icons.

**`src/systems/PlayerDebuffs.ts`** (framework-free, like Health/Stamina/Bleed) is deliberately
separate from the DoT managers: a DoT's design problem is stacking damage, a lockout's is **uptime**,
and only the second needs a diminishing-returns ladder. One slot per kind (refresh-don't-stack), a
per-kind DR ladder (100/50/25/immune inside 12s), resistance scaling duration at apply time, an
immunity set, and `dispel()`.

**Each debuff has exactly one hook, all at existing choke points** — no new movement/attack
branches. Root reuses `Player.update`'s `inputEnabled` + `canDash` args; Disarm early-returns in
`tryAttackEnemy`; Silence early-returns in `tryCastAbility` **ahead of the cooldown check**, so a
silenced press never burns the cooldown; Enfeeble multiplies `damageBonusMult()`. Root deliberately
leaves attacking alone and Disarm deliberately leaves movement alone — keeping those genuinely
different is what stops the four reading as degrees of one effect. Two more deliberate choices:
Enfeeble is applied as a **true multiplier outside** the additive damage bucket (folding −30% in as
an additive term would let a couple of damage relics erase it, the same reasoning that keeps class
skill-XP affinity out of the additive XP bucket), and each blocked action now **says so** — every
other guard on those paths (cooldown, stamina, reach) has a visible cause on the HUD and a debuff
the player may not have registered does not.

**Delivery rides the existing `pendingBleed`/`pendingPoison` contract** (new `Enemy.pendingDebuff`
+ a `debuff?` field on the `checkPlayerHit` return), so debuffs inherit the i-frame guard —
**a dashed-through attack applies nothing**, verified. One clear teacher each, all on already-
telegraphed attacks: **Mirejaw** death roll → Root (a latched grip already plants you; kept short so escaping
between thrashes stays real); **Mosswretch** smash → Enfeeble −30% (on the smash, *not* the spore cloud — the cloud routes through
`environmentEffectAt`, which makes it terrain, and terrain is undispellable); **Corpselight**
collapse slam → Silence (only the collapse, never the dissolve puff); **Miretyrant** Gorge
Heave → Disarm, the only disarm in the game, on the one fight built out of long telegraphs,
and on precisely the attack that already exists to throw you *out* of melee.

**Counterplay.** **Fenwash** (new `cleanse` ability family, craftable at the Gemwright's Table like
Mire Snare/Bloodrush — a *requested* ability behind an epic-drop roll reproduces the "I never found
one" problem) strips all four plus bleed/poison and wards 1.2s, so the creature standing on you
cannot undo the cast on the completion frame. Resistance is one **`MainScene.statusResistMult()`
choke point** summing three sources additively (floored at 0.25): the gear passive, the Magic skill
(−0.5%/lvl, cap −40%), and the new **`warding` relic family** — its own family rather than folded
into `defense`, since status resistance and damage reduction answer different problems and folding
them would mean one slot could never buy both. Its Rare/Mythic carry a `wardbreak` proc that
auto-strips the first lockout on a cooldown. Hard immunities come from `EquipPassive.debuffImmunity`
and `RunModifier.debuffImmunity`; the **Warden** gets "Cannot be Disarmed" — narrow on purpose (one
attack in the game applies disarm), so it reads as a boss-fight answer rather than flattening the
system.

**Two knock-ons worth knowing.** The Magic skill **no longer scales magic weapon damage** at all —
taken as written, and noted to the user as also being a Gloam/Ember Brand nerf. And
`InventoryMenu`'s relic grid had a literal `RELIC_GRID_ROWS = Math.ceil(8 / RELICS_COLS)`, which
would have silently clipped the 9th family off the panel; it is derived from `RELIC_FAMILIES.length`
now.

**Display**: the debuff rows reuse the already-generic `StatusBarUI` (its own note predicted "adding
a future debuff = one more row" — this is the first real user of that), listed **before** the terrain
rows so lockouts sit leftmost. Icons went **26 → 42px** — the user asked, and the status art is
authored at 32px, so a 26px box had been rendering it oversized and clipped by its own frame.
Per-debuff world FX follow the player (root ring under the feet, silence/disarm glyphs overhead,
enfeeble wisps), a callout fires for the three lockouts but not Enfeeble (reserving the shout for
losing control keeps it meaningful), and the **Q/E/R bar greys to the silence violet** — matching the
status icon's accent, and distinct from the cooldown sweep because "re-arming" and "cannot cast at
all" are different problems.

**Verified live** (`preview_eval`, zero console errors): the DR ladder measured exactly
2000/1000/500/blocked; resistance 0.5 halving duration; Magic 0→40→100 giving ×1.0/0.8/0.6 (cap
correct); relic 10% + skill 10% → ×0.8 additive; immunity a hard no-op with Root still landing on the
same Warden; Root flipping both `canDash`/`inputEnabled` false through a spy on the real
`Player.update` call; a silenced cast not burning its cooldown while an unsilenced one fires; a real
club swing dealing 2.3 → **0** disarmed → 2.3 cleared; enfeeble 2.25 → 1.59 (×0.705) through a real
swing; the dispel clearing control+DoTs; **standing in a simulated miasma re-poisoning one frame
after a cleanse while the terrain slow was never removed at all**; dash i-frames negating a debuff;
wardbreak stripping on the next frame, going on cooldown, and a second debuff correctly sticking
inside it; all 10 new textures present; FX sprites created/destroyed with the debuff set; and the
Mosswretch driving its real 780ms smash into a live enfeeble at frame 32. `tsc` clean.
`RECIPES.md` (jewelry row, warding relic row, 8→9 families) and the dashboard's manually-mirrored
Enemies tab both updated — the Miretyrant's Gorge Heave was missing from it entirely and is now
listed.

### Ashcaller-run review + balance batch (2026-07-26, Opus)

Off the user's win — 81:06, 547 kills, level 27, Gloam Brand + Mirehide + 8 relics — with a
10-item feedback dump ending "review all of the screenshots and numbers." The review came first and
found the two headline complaints had exact arithmetic behind them.

**Why nothing threatened him — the Bulwark Mantle hit cap. The cap is now GONE.** The Mythic
defense relic capped any single hit at 30% max HP, and `applyDamageToPlayer` applied that cap
**before** the flat-armor subtraction. So 30%×260 = 78, minus 44 armor = **34**. Every boss and
miniboss attack in the game — Miretyrant Chomp 225, Slam 255, Sanguinarch Slam 205 — collapsed to
the identical 34, i.e. 8 connects to kill him against 2 without the relic. The cap was worth ~79%
mitigation; the relic's *other* half (a free negate every 6s, one hit in ~5.5 on a 1.1s cadence) was
worth ~18% — which is what the user assumed was doing the work. Pre-armor, "cap at 30% max HP" in
fact means "cap at 30% minus your entire armor value", so it got **stronger the more armor you
wore** — backwards for a safety net.

The user's call was to cut the mechanic outright, not re-order it: *"I don't like that effect of
hard capping attacks — it makes scaling weird to scale off player HP."* Which left the relic with
nothing, because the raw stat **plateaus at Uncommon** (Aegis Totem and Bulwark Mantle both carry
`damageTakenPct: -7`) and every Rare/Mythic pair shares one `UniqueKind` — strip `capPct` and the
Mythic was "negate every 6s" against the Rare's 8s.

**The replacement (his spec): the negate BANKS CHARGES, and the recharge clock restarts on every
hit you take.** Mythic holds 2, Rare holds 1, both regaining one per 10s. Getting hit pushes the
clock out whether or not a charge was there to spend, so charges only come back once you have been
left alone for a full window — which turns the Mythic into an answer to a *burst* (a boss combo, a
swarm landing twice) instead of a free hit on a metronome you never had to play around. It is one
new discrete param on the shared kind, matching how every other Mythic differentiates (leech gains
overheal→shield, second wind a free-attack window, killrush a dash refund).

**The reset rule applies to the Rare too, and that is forced, not a preference:** they share the
kind, so if only the Mythic's charges reset on damage, the Rare's guaranteed-every-8s negate would
be strictly better in exactly the sustained fights the Mythic exists for. **DoT ticks are naturally
exempt** — bleed and poison never route through `applyDamageToPlayer`, so a lingering wound from a
fight you already walked away from can't block the refill. Verified live with dense sampling: a hit
at t=4s pushed the first charge from t=10 to t=14, the second landed at t=24, and a 225 chomp now
lands in full rather than being flattened.

**Why the Brand deleted everything — three things compounding.** (1) At 29 dmg / 520ms it had the
**highest single-target DPS of its whole tier** (55.8 vs the pike's 52.5, sword's 53.2); the
`Weapons.ts` comment still called it "mid-pack", which was written for the *Ember* Brand and never
re-checked. (2) Its designed drawback — being shrugged off ×0.4-0.5 by the gloam-casters — **stopped
existing on 2026-07-24** when enemy resistances were deleted roster-wide; it kept the compensation
and lost the cost. (3) `applyWeaponBurst` took `finalDmg`, the **post-crit** number, so at 55% crit
every other swing detonated for ~3× across a **118px** radius — against a player melee reach of 64,
and wider than the Gloam Nova ability, which costs a 10s cooldown. Fixed all three: **damage 29 →
22**, **burst 118/0.8 → 82/0.55** (Ember Brand 88/0.55 → 68/0.45), and `resolveWeaponHit` gained a
`burstBase` parameter so the detonation is computed off the **pre-crit** hit. Verified live: primary
28.6 → 48.91 on a forced crit while the burst stayed **15.73 in both cases**.

**Knockback was cosmetic across the entire game, and the fix is the load-bearing change here.**
Every source set a body velocity that `Player.update()` overwrote on the very next frame
(`setVelocity(0,0)` when idle, the input vector when moving) — a known-deferred limitation since the
souls-like pass. New `Player.applyKnockback(angle, speed, ms)` opens a window where `update()`
surrenders the body to Arcade, **exactly mirroring the existing `dashingUntil` early-return**, and
checked *after* it so a dash already in the air still finishes while a dash *started* during the
window is blocked. Default 160ms keeps existing numbers a shove rather than a launch. Measured: an
ordinary bite shove moves you **23px**, the new heave **186px**; both were 0 before.

**Miretyrant "Gorge Heave"** (the user: "push you away like a knockback out of melee range that you
have to dodge"). Its other four attacks all ask "does this hurt me", answered by leaving; this one
inverts the bruiser's premise — it wants you close, and this is how it decides when you're *allowed*
to be. 660ms telegraph, 190px radial, **the smallest damage in the kit (130)** because the payload is
a 620-speed / 300ms shove that clears melee outright, and the cost is the walk back through whatever
the last bellow left standing. In the **base pool**, not phase-gated, or the fight teaches the wrong
spacing for two thirds of its length. Its telegraph is a full-size ring with outward spokes,
deliberately unlike the slam's growing filled circle.

**The score formula was inverted and the par fix hadn't cured it.** `Run.ts` says the completion
term "is meant to dominate the flat kill points"; his run scored 10,080 kills against a 2,219
completion bonus — 82% farming. Even the ×3 speed cap was only worth 6,000 against those same
10,080. `COMPLETION_BONUS` 2000 → **6000**, sized from the crossover: a 45-minute / ~250-kill run
must beat a 90-minute / ~550-kill one, which needs it above ~4,830. **Existing high-score entries are
no longer comparable** ([ Clear ] resets them).

**The run summary was under-reporting.** `recordDamageDealt` had exactly ONE call site, so weapon
burst, crit splash, ability damage and set-bonus bursts were all invisible — for a Brand build that
is a large slice, and "53% direct" was never the real ratio. Four new attribution labels.

**Four confirmed bugs, each with a named cause.** (1) Every gemwright ability item showed a **"Q"**
badge: `abilityKeyLabel` derived the hotkey from `def.armorSlot`, and all 11 ability items declare
`ability1` — stale since the group rework made position the player's choice. Now reads **"Q/E/R"**,
with the badge sized off its label. (2) The **class blurb overflowed its panel**: `CharacterMenu`'s
`text()` set no `wordWrap` and the Ascetic's blurb is ~562px in a 460px panel. Every *data-sourced*
line (blurb, modifier, derived affinity) now wraps to the panel and advances by its **measured**
height — a fixed step would just move the overlap one wrapped line down. Verified 0px overflow on
all five classes. (3) **Poison clouds didn't stack**: `foldSporeCloud` broke on the first cloud and
took `Math.max`, so ten clouds cost what one did. Now counts them (cap 4 → 5/10/20/20 dps); the slow
and regen suppression stay flat, since compounding the slow would pin you with no counterplay. (4)
**Kill loot had no magnet delay at all** (nodes already had 550ms) — that's where "it insta picks
up" was loudest. `HARVEST_MAGNET_DELAY_MS` 550 → **1000**, now applied to kill loot too; measured
1313ms from the kill including death feedback.

Also re-synced `RECIPES.md`'s weapon table, which had drifted on every row (arcs, stamina costs and
three damage numbers), and archived ~30KB of accumulated narrative out of `## Current State`, which
had been appended to against its own rule. `tsc` clean, zero console errors, everything above
verified live via the browser preview.

### Custom cursor: one icon, with a click jab (2026-07-26, Opus)

Item 3 of the user's order, and reworked twice mid-session off his feedback — worth recording,
because both corrections were about restraint rather than about the art.

**Shipped first, then cut back:** three cursors (arrow / gauntlet / attack reticle) driven by the
prompt state `updateHover` already computes. The user's call was **"only a single icon, with a
clicky animation when you click on something that is interactible"**, and he's right — the
bottom-right prompt and the hover outline already report what's under the pointer, so a third
signal that changes SHAPE is noise competing with two that already work. He also picked the
gauntlet ("I like the finger one") over the arrow I'd have defaulted to, and called the x2 scale
too big. It ships as one 14x21 hand at 1:1.

**The jab is the whole interaction.** Two frames (0.78 then 0.92 scale, 70/80ms) and back — the
hand shrinks toward its own fingertip and springs out. Gated on the same "is there anything here"
question the rest of the UI asks: a world target that produced a prompt, or any interactive UI
element under the pointer (`hitTestPointer`). Driven by wall-clock timers rather than the scene
clock, because menus stay usable while the run is paused and a cursor frozen mid-press on the
pause menu's own buttons would be a visible bug.

**The user's third note — "make sure it is easily readable everywhere" — is why the outline exists**
and why it lives in `cursor.ts` rather than in the PNG: a dark gauntlet dragged across near-black
menu panels, unlit crypt floors and the night overlay would vanish on all three. A 1px pale rim is
traced around the silhouette at build time, and since the art keeps its own dark outline inside it,
the cursor carries a light edge and a dark edge at once. Same reason OS cursors are shaped this
way. Putting it in code means new cursor art inherits it instead of having to remember it.

**Two things are derived from the art rather than hardcoded**: the hotspot (leftmost solid pixel of
the topmost row — for a hand pointing up-left that IS the fingertip), and the jab's scaling anchor,
which is that same point, so all three frames report an identical hotspot and a click during the
animation lands exactly where a click before it would have. Verified: hotspot 4,1 in every frame.

**One shim, not 76 edits.** `setInteractive({ useHandCursor: true })` stores the literal string
`"pointer"` on each object and writes it to the canvas on hover, which would have flipped to the OS
hand over our own menus at all 76 of those call sites. `InputManager.setCursor` translates it once,
rewriting the object's stored cursor in place.

Verified live: the jab fires over a world prompt and over a real hotbar slot, does NOT fire over
empty ground, settles back to base, and survives `scene.restart()` without re-registering its
handler. `tsc` + `npm run build` clean, no console errors.

