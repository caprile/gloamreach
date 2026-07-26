# Status

## Current State

_Living snapshot — edit in place, never append._ Last shipped: **an 11-item bayou playtest batch**
(2026-07-26, Opus) — a run-ending crash (a projectile resolving against the enemy that fired it
after that enemy died), an equip bug that let three pairs of legs be worn at once, a **bow
governor rework** (the `ranged` skill now buys REACH not damage; the post-shot slow scales with the
shot's own cooldown, so attack speed no longer buys safety), a dungeon-boss wedge reset that closes
the bow-cheese-in-a-doorway exploit, two spoiler/accuracy fixes on readouts, and four small feel
items. Before it, same day: **the custom cursor**, **menu chrome art**, the Inventory's **Active
Effects tab**, and **attack-FX art across the whole roster** — the user's three-item art order,
now complete.

**In progress / next.** Nothing is queued. Open from earlier notes: menu **buttons and tabs are
deliberately still flat** (the agreed chrome scope was frames + slots; the generated kit's
button/tab pieces are already downloaded in `art/work/` if that's wanted), a stouter/gobliny
gremlin, and the ~19 ambient props that need regenerating as objects before they can animate. The
oldest outstanding non-art item is still **a playtest at the post-flat-armor combat numbers** —
now also wanting a check on the reworked bow numbers, which are first-pass. **Hitching was
investigated and not reproduced** (median 3.9-5.0ms, zero frames over 16ms across ~8,000 samples);
if it persists now the crash is fixed, it needs a repro rather than more synthetic profiling.

**Two rules worth carrying forward from that batch.** (1) **A thrown exception inside the physics
step costs no measurable frame time** — the frame is fast, it just aborts the rest of the step, so
entities don't move that frame. It stutters visibly while a frame-time profiler shows nothing;
don't rule out an exception because the numbers look healthy. (2) **Interchangeability belongs to
the slot GROUP, not to the equip path** (`Equipment.slotAccepts`) — the group model was written for
specials and abilities, where any slot will do, and silently applied that to gear.

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

Before that: icons (181), world props/flora/
ore/POI structures/crypt tiles/map markers/ability icons (182), the **player rig** (5 survivors,
4-direction idle + walk, themed on their starting ability, `src/art/playerRig.ts`), and the
**creature roster** — all 14 common creatures plus all 8 bosses, **19 of 22 animated**
(idle/walk/attack, `src/art/creatureRig.ts`), with the 14 elites recoloured from their bases
automatically. Roughly **500 real assets**; every override key resolves, no filename unmatched.
**Each animated creature now plays the attack it actually performs** (Gremlin throws, Palewake
hauls its tether, Kilnborn spins, gators chomp) rather than a shared `cross-punch` — the mapping
table lives in `art/README.md`.

**Deliberately NOT animated:** Snake, Sandmaw and Corpselight — a legless serpent, a burrowing
worm and a floating wisp fit neither the humanoid nor the quadruped skeleton. The first two are
ambushers whose read is stillness; the Corpselight already hovers via `bobPhase` in code.
**Deliberately still placeholder:** the tiny 6x6 projectiles (a 32px generation downscaled to 6px
is mush). **No player attack animation** — both generation routes were tried
and rejected; the body pulses and the held item lunges instead. **No weapon-in-hand sprites** — the
plan's anchor needed a per-frame hand joint the API doesn't expose.

The user's call on elites: the recolour is "good for now". Bespoke elite art is a possible later
pass, and since `eliteVariants.ts` skips any elite key that was itself overridden, dropping in a
real `<name>_elite.png` simply wins.

**Attack-FX art is DONE** (item 1 of the user's order) — ten attacks plus two previously-invisible
boss hits now spawn real art through `src/art/attackFx.ts`. The one exception is `fx_fire_cone`,
which has no real art on purpose: the generator failed five distinct ways on a top-down cone of
fire, so a scalloped generated wedge ships and a PNG can be dropped in later with no code change.
**Next: (2) on-theme inventory and crafting menu art** (`create_ui_asset` for panel/slot frames,
buttons, tabs); **(3) a unique in-game cursor** (`input.setDefaultCursor`, worth a hover/attack
variant given the game is mouse-driven). Also still open from the user's earlier notes: a
stouter/gobliny gremlin (the humanoid rig reads too human; custom proportions came out worse, so it
needs a different approach) and the ~19 ambient props that need regenerating as objects to animate.

**Still placeholder, deliberately:** the tiny 6×6 projectiles (`gremlin_rock`, `pellet_projectile`,
`gloam_bolt` — a 32px generation downscaled to 6px is mush; the procedural dot is better). Ground
tiles are static, so water does not animate — that belongs with the ambient-prop animation pass.

**The last playtest pass fixed a bug worth remembering.** All 8 POI ground decals came back
**fully opaque** despite the prompt asking for transparency, drawing a light rectangle behind every
POI. It survived every check I had: an image viewer composites over white so the art looked
perfect, and `trim.mjs` had been an *accidental* opacity check (a transparent margin is exactly
what it crops) — which `fetch-raw.sh` removed when decals stopped being trimmed, since their margin
is load-bearing. Fixed deterministically with `adjust.mjs --feather` (smoothstep radial alpha)
rather than re-rolling, verified against the LIVE texture rather than the file, and made
unmissable: `art/tools/check-alpha.mjs` flags solid corners and `fetch-raw.sh` runs it on every
download (four opaque corners is expected for a tile, a bug for anything else). Same pass: the
crypt exit became a **lit archway** instead of a staircase (it reads as "way out", and pairs with
the daylight shaft), and the crypt POI's surface ring markers became **rune-carved pillar stumps**
matching the interior instead of grave slabs that looked like they belonged on grass.

**Three things this session changed beyond the art itself:**

1. **`src/art/variants.ts` — a `<key>_v2` PNG now varies every node of that kind, no code change.**
   the user: decorations, rocks, boulders and trees all look too uniform. `scatterDecorClustered`
   already fixed the *spacing*; this fixes the *shapes*, since the eye locks onto a repeated
   silhouette however well positions are scattered. Resolved inside **`ResourceNode`'s constructor**
   rather than at the ~20 spawn sites, and picked by **hashing the prop's position** so the world
   looks the same on every load without threading an RNG through the samplers. A `_picked` state
   follows the variant actually chosen (`<variant>_picked`), falling back to the shared one.
   `overrides.ts` no longer flags `_v2` keys as typos — they are intentionally new keys.
2. **Animation scope widened (the user): "anything that moves or could move should have animations
   even if ambient."** This **reverses locked decision 4's "~327 of 377 never animate."** It decides
   a tool *at generation time*: `animate_object` only accepts `create_1_direction_object` /
   `create_8_direction_object` results — a **`create_map_object` result can never be animated** and
   auto-deletes after 8h (confirmed via `agent_help`). Static geometry (rock, log, plank, wall) stays
   on the cheap map-object path; flames/crystals/reeds/banners/water need the object path.
   **Cost fork:** a 1-direction object is **25 generations** vs 1 (it returns 64 candidates to pick
   from — proven on `camp_brazier`). So Phase 3 continues on map objects, and the ~19 identified
   animatable props get regenerated as objects during the animation pass, style-matched from the
   approved PNG. **Trees are the open call** — canopy sway is the most visible ambient motion, but
   trees are the highest-count prop and 5aq established the display list is the frame-rate ceiling.
3. **Sizing rule settled: world props may grow, creatures may not.** Nothing gameplay-relevant reads
   a *prop's* sprite size — node/structure/POI interaction is centre-to-centre against a flat
   `REACH`. Only enemies (`enemyReach`, `Enemy.reachBonus`) and dens (`denReach`) scale with sprite
   radius. Props therefore ship at whatever the art wants, which is forced anyway: PixelLab's canvas
   floor is 32px and most placeholders are 14-30px. New `art/tools/trim.mjs` (dependency-free PNG
   decode/encode via `node:zlib`) crops the alpha box — generation pads a wide prop with transparent
   rows, and a sprite's origin is its centre, so untrimmed padding shifts the prop off its own anchor.

**Two playtest fixes.** **Blackberry bushes appeared to vanish when picked** — the mechanic was
fine (node survives, texture swaps, regrows); the cause was **my own partial migration**: the base
had real 33×25 art while `blackberry_bush_picked` was still a 24×20 placeholder, so harvesting
swapped art *styles* mid-world. **A `_picked`/`_shielded` state variant must ship in the same batch
as its base.** Verified live. **The three warbow icons drew as sticks** — no limb curve, no string.
`trim --report` turns out to be an objective acceptance test: a "bow" whose alpha content is 3-7px
wide cannot be one. All three regenerated and re-measured (16-30px wide).

**Still open from this session's feedback:** `decor_log` reads as choppable but isn't — the user
wants it re-arted as something inert (regenerated as exposed mossy roots; the *key* should probably
be renamed in a later code pass) and wants **more decoration variety generally** to give the map
life outside farmable nodes. Gremlin huts were too small; a 96×80 replacement shipped.

**PixelLab throughput collapsed mid-session** — jobs pinned at `95% eta ~0s` for 25+ minutes while
**still holding concurrency slots**, dropping the usable 4-job limit to ~1. Reported upstream via
`agent_feedback` (twice now, counting Phase 2). It recovered on its own; new jobs were accepted
while the zombies hung, so the cap — not the service — was the blocker.

**Two pipeline traps found late, both recorded in `art/README.md`:**

1. **"Derived variants are free" only holds at BUILD time.** `BootScene`'s `cryptShell("gloam", …)`
   *generates* `crypt_wall_gloam` from a palette; it does not recolour `crypt_wall` at runtime.
   `applyTextureOverrides` runs after `makeTextures()`, so **overriding a base never reaches its
   themed variants** — a real `crypt_wall` alone would give the Miretyrant lair real art while the
   three themed crypts kept placeholders. Every crypt *object* was therefore authored ×4.
   **The same trap is waiting for the 14 `*_elite` creatures in Phase 4** — decide before starting:
   author 14 more, or move derivation to after overrides.
2. **Tiles are not props.** `crypt_wall`/`crypt_floor`/`lodge_plank`/`grass` are drawn as
   `tileSprite`s and must be seamless; `create_map_object` centres an object on transparency and
   visibly seams. `lodge_plank` was generated that way, caught, deleted, and redone via
   **`create_tiles_pro`** — which returns **16 candidates as a ZIP** (not a PNG), full-bleed with no
   transparency. **Never `trim.mjs` a tile** — it would crop the bleed that makes it tile.

**Sizing is a rule, not a list** (three iterations to land it, all off the user's feedback): real art
keeps its natural size by default; **ground clutter** (placeholder ≤ the 20px player) is pulled back
to its placeholder footprint; **gatherable crops** (`action === "pickup"`) are sized off their own
placeholder ×1.15 capped at 30px; **POI ring markers** likewise ×1.3. The signal is always data the
game already has, so new assets inherit the right rule without anything to maintain. Net effect —
trees 38×56, boulders 42×32, crops 16-28, clutter 16-18, against a 20px player.

Icons are authored at **32×32**, and every UI surface renders them at an **integer** scale —
inventory and hotbar slots went 46→**70** (`ICON_BOX` 64, ×2) and the crafting list draws its icon
at 32 (×1). The old 34px box showed them at ×1.06, which reads as distortion rather than
magnification. The inventory grid went 6→7 cols / 15→10 rows to fit. `Player.equippedIcon` now
normalises to a fixed 24px **world** size, so icon resolution can never change how big a held weapon
looks.

**A searchable reference gallery is published** at
`https://claude.ai/code/artifact/85634db4-b956-4b45-8b0f-c85f0af8621b` (republish the same file
path to keep that URL). It groups every asset by category, filters by key, and offers ×1/×2/×4
zoom over a checkerboard so transparency reads.

**It is now generated from the repo, not hand-assembled** — `art/tools/gallery.mjs` reads
`art/sprites/` and inlines every PNG as a data URI (the artifact CSP blocks external hosts, so a
linked image would silently render nothing). Phase 2's build scripts were written ad-hoc and thrown
away, which is exactly why this one is committed: re-run it and republish, never rebuild it.

**Operational lessons from finishing the batch** (full detail in `art/README.md`): PixelLab's queue
occasionally stalls hard — jobs pinned at `95%` or cycling with a growing ETA for **20+ minutes**,
not the usual 60-90s, observed even on the paid Tier 1 plan (reported upstream twice via
`agent_feedback`). **A `download` call at true 95% genuinely 400s** (`"still being generated"`) —
the earlier assumption that 95%-and-stuck might mean silently-complete was wrong; it isn't done
until `list_objects` drops the progress column entirely. **A queued-but-undownloaded job doesn't
disappear** — three icons (`mirebronze_ingot`, `mirebronze_helm`, `cattail`) were generated
successfully but the download step was skipped or mislabeled onto the wrong filename earlier in the
session; caught only by diffing the expected 181-key manifest against what's actually on disk and
re-fetching each pending job ID directly rather than assuming "not on disk" means "never
generated." **Always verify a batch against the authoritative key list before calling it done** —
this is why the last ~15 icons took longer than the throughput math predicted.

The user is on PixelLab **Tier 1 (2,000 generations/mo)**; the whole 181-icon pass used under 200 of
those. **The API key was pasted in plaintext and should still be rotated.**

**Gameplay state is unchanged from the previous batch:** **Reaver-run playtest batch, part 1 —
stat caps, shrine budget, boss pacing** (2026-07-24, Opus; full writeup in `STATUS-archive.md`).
Off the user's Reaver win (69:56, 936 kills, level 31). **All 15 items are done.** Headlines: a **hard 100-point cap on every stat** plus a
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

**Part 3 shipped: the 4 remaining fixes.** (1) **Auto-stacking** — the fragmentation came from
CONSUMPTION, not addition: `add()` tops up every partial it finds, but `removeCount` drains
front-to-back and leaves the head stack partial while a tail partial from an uneven total sits
there forever, which is exactly 69/99/44. New `ItemContainer.compactStacks(key)` runs at the end of
`removeCount` — merge-only and position-preserving (NOT `sortAndStack`), and deliberately not hooked
to `moveSlot`/`afterItemMove` because a Shift+click split intentionally creates a partial and would
be undone instantly. (2) **Cooking-menu overlap** — the footer's cost line has a wrap width and a
3-long-name dish takes two lines, while `Qty:` sat at a hardcoded `y + 28`; now measured off the
real text height. **The identical bug existed in `JewelryMenu`** and was fixed with it. (3)
**Convert All** on the forge's Convert tab, batched INSIDE `convertShards(id, runs)` so a 50-shard
render is one toast and one sound rather than fifty (the toast-spam rule), each run still
re-checking cost. (4) **Drag abilities onto the Q/E/R HUD bar** — new `AbilityBarUI.slotAt()`
mirroring `HotbarUI.slotAt`, plus a drop branch gated by slot GROUP; position is the hotkey, so
dropping an `ability1`-declaring item on the R pip equips it to `ability3`. New derived
`ABILITY_SLOT_IDS` (from `EQUIP_SLOTS`, so it can't drift).

**Workbench Lvl 4->5 glyph — FIXED, and it was a real bug (item 15).** My first pass wrongly closed
this as a content dead-end; the user corrected it ("I placed down workbench, built the gloamsteel,
100% had enough materials to upgrade to lvl 5 and it did not show the upgrade available icon").
Root cause: **`canAffordUpgrade` counted the BACKPACK only**, and ingots/reforge inputs routinely
live on the hotbar, so the check — and therefore the floating ▲ glyph it drives — read zero. The
damning detail: `Crafting.ts` already carries a hotbar reference added off the user's earlier report
of *this same thing* ("still not looking at items in hotbar when considering upgrades") — the fix
landed in crafting and never reached the upgrade path. New `MainScene.heldCount()` (backpack +
hotbar) and `consumeHeld()` (backpack first, then hotbar, mirroring `kindleShrine`) now back every
upgrade/augment affordability check, all 5 cost deductions, and `formatUpgradeCost` (which otherwise
would have read "0/5" while you held 5). Verified with materials in the HOTBAR ONLY: glyph appears,
readout reads 8/5, 9/6, 5/3, applying takes tier 3 -> 4 and deducts exactly -5/-6/-3 from the
hotbar, a split backpack+hotbar payment drains the backpack first, and the glyph clears afterward.
**Lesson worth keeping: when a "materials aren't counted" bug is fixed, fix it at every cost site,
not just the reported one.**

All 15 items of the batch are now done.

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
floor** — the win-con boss included. The user's call was to KEEP flat subtraction and raise enemy
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

**Still open from that batch: a playtest at these numbers**, specifically the Miretyrant fight and
whether the bayou now out-threatens the badlands. That is independent of the art arc — the art work
touches no combat numbers.

## Recent Entries

> Older entries in STATUS-archive.md.

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

### Bayou playtest batch: crash, equip bug, bow governor, 8 fixes (2026-07-26, Opus)

Off a bayou run that ended in a hard crash. Eleven items; the user picked the bow direction and
"all of it, one session" via `AskUserQuestion`.

**The crash: a projectile outlives the thing that fired it.** Killing a Corpselight while its orb
was in flight, then letting that orb hit the player, ran the overlap handler's
`sourceEnemy.onProjectileHitPlayer()` → `markAttackLanded` → `markAttackAnim`, which reads
`this.scene.time`. Phaser clears `scene` on destroy, so it threw and took the run down. Guarded at
both ends (`Enemy.markAttackAnim`, `Enemy.onProjectileHitPlayer`). This is a **structural
consequence of last session's ranged-deaggro fix** — routing a landed shot back to its shooter
created a reference from a projectile to an enemy that can die first, which nothing else in the
codebase does. Verified live: the exact call on a destroyed enemy now returns instead of throwing.

**Gear slots were one shared pool, so you could wear three pairs of legs.** `EquipSlot`'s group
model (5ar) made equipping route to `firstFreeIn(group)`, which is right for the four specials and
the three Q/E/R slots and wrong for gear: a helmet is still a helmet. **Interchangeability is now a
property of the GROUP** (`GROUP_INTERCHANGEABLE`, `slotAccepts`, `Equipment.targetSlotFor`) rather
than an assumption baked into the equip path, and `slotAccepts` is the single authority for both
the drag path ("is this a legal drop?") and auto-equip ("where does this go?") so the two can't
disagree. Verified: a second pair of legs swaps into `legs` instead of filling `chest`, while a
second ability item still fills `ability2`.

**Bows: the two levers that actually govern a bow, not a third damage pass.** The user, on a
Bloodrush + bow run: "insanely OP... the walk-backwards-and-spam-shooting strat is a real thing"
and "the range feels pretty crazy." Damage was left alone deliberately — the two previous passes
were both damage passes and neither held.
- **The `ranged` skill now buys REACH instead of damage** (the user's own suggestion) — the one
  weapon skill excluded from `weaponSkillDamageMultiplier`, paying out via
  `rangedSkillRangeMultiplier` (+0.4%/lvl, +40% at the cap). Base ranges cut ~20% (380/400/420 →
  300/320/340), so a maxed archer lands near the old numbers and a fresh one nowhere near.
  `MainScene.rangedRange()` is the single site every consumer reads — attack gate, hover prompt,
  reach ring, the projectile's own despawn distance, stats panel — so a shot can never be legal at
  a distance the ring didn't draw.
- **The post-shot slow now scales with the shot's own cooldown.** It was 0.72x for a flat 350ms,
  which is *under* every bow's cooldown (540ms+) — an unhurried shooter recovered full speed
  between every shot, so the anti-kite governor did nothing to the reported strategy, and haste
  made it worse by fitting more shots through the same recovery gap. Now **0.45x for 85% of the
  actual cooldown, haste included**: firing faster no longer buys free repositioning. Measured
  live — 459ms of a 540ms loop unhasted, 300ms of a 324ms loop (93%) under Bloodrush. Attack speed
  still means more damage; it no longer also means more safety.

**Dungeon minibosses could be bow-cheesed in doorways.** New `Enemy.forceDeaggro(now)` with the
same override contract as `forceAggro`/`isAggro` (the three wardens drive their own `aggroed`
field, so they override it), driven by `MainScene.updateDungeonWedge`. **Wedging is measured as
DISPLACEMENT, not "is the body blocked"** — Arcade zeroes the blocked axis during separation, so a
wedged enemy reads as velocity-0 on most frames and is indistinguishable from one that chose to
stand still; where it stands over four seconds is not ambiguous. The reset routes through
`enterGivenUpState`, whose re-aggro immunity is the point rather than a side effect, and since
bosses regen while deaggro'd the cheese pays nothing rather than paying slowly. The wardens' own
900px leash is sized to own a whole vault, which is why wedging a few tiles from spawn never
tripped it. Verified: a pinned warden resets at exactly 4000ms; one that keeps moving never does.

**Two UI leaks of information the player hadn't earned yet.** The bottom passive strip re-reads the
live relic set every frame, and a forge roll mutates `RelicManager` at the CLICK (the spin is
theatre over a known result), so the new relic's name, rarity colour and effect appeared down there
mid-spin. `relicDisplayHold` pins the strip to its pre-roll snapshot until the reveal lands — the
forge's own grid already did this, the always-on HUD didn't. Closing the forge mid-spin now flushes
the announce too, since `revealFx.stop()` kills the tween without running its callback, which would
have stranded the hold forever. Separately the **Active Effects "Skill XP" axis computed its total
as a PRODUCT while the game uses an additive bucket, and dropped the Prodigy streak entirely** — it
now mirrors `awardSkillXp` exactly. The class's **per-skill affinity** was missing altogether (the
user: "effects page doesn't show my exp bonus from class") and is its own row, because it
multiplies *outside* that bucket and has no single number.

**Four smaller ones.** The selected hotbar slot gets a **lit warm fill**, not just an accent on the
edge — once the frame art landed, selection was an amber tint on an already ornate border. Chop/mine
prompts **name the node** ("[LMB] Mine Boulder"), which reveals nothing the prompt-gating rules
protect since the prompt only appears once the right tool KIND is out. Node drops carry a **550ms
magnet delay** so you see what came out. And `icon_stone_pickaxe_t1` was a horizontal hammer:
**four rerolls all drifted the same way**, confirming the README's known-hard-prompt note for picks
and axes, so it's now derived from the base icon — whose silhouette already reads correctly — by a
new reusable **`art/tools/recolor.mjs`** (hue-selective, skips near-greyscale pixels so a wooden
haft survives a recolour aimed at a stone head). **For a tier variant of a hard-to-draw tool,
recolour the base rather than reroll.**

**Hitching: not reproduced, and the profile is healthy.** ~8,000 sampled frames across idle, a long
continuous traverse through fresh bayou terrain, and POI clusters: median 3.9-5.0ms, p99 6.2-6.5ms,
**zero frames over 16ms**. The likeliest culprit is the crash bug itself, and the experiment that
suggests it is worth keeping: a throw inside the physics step costs **no measurable frame time**
(median 4ms with and without), because the frame is fast — it just aborts the rest of the step, so
the player and enemies don't move that frame. **That stutters visibly while a frame-time profiler
shows nothing**, and a bow killing casters at range hits that path constantly. If it persists now
the throw is gone, it needs a repro rather than more synthetic profiling.

`tsc` clean, no console errors. `RECIPES.md` ranged-weapon table + `art/README.md` updated.
