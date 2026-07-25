# Status

## Current State

_Living snapshot — edit in place, never append._ Last shipped: **Phase 3 of the art arc —
essentially COMPLETE at 160 world props** (2026-07-25, Opus)
(`.claude/plans/art-textures-lighting-3-biomes.md`). Forest, badlands and bayou are fully real art
(terrain, flora + every `_picked` state, ore, POI structures + ring markers, decals), as are all
crypt tiles and objects across four themes, all 12 map markers, all 11 ability icons and the
larger projectiles. **341 real assets total** (181 icons + 160 world). Next: Phase 4 (player rig).

**Still placeholder, deliberately:** the tiny 6×6 projectiles (`gremlin_rock`, `pellet_projectile`,
`gloam_bolt` — a 32px generation downscaled to 6px is mush; the procedural dot is better), and the
**ground itself**, which is its own final phase (see below).

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

the user is on PixelLab **Tier 1 (2,000 generations/mo)**; the whole 181-icon pass used under 200 of
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

**Still open from that batch: a playtest at these numbers**, specifically the Miretyrant fight and
whether the bayou now out-threatens the badlands. That is independent of the art arc — the art work
touches no combat numbers.

## Recent Entries

> Older entries in STATUS-archive.md.

### Art arc Phase 3 — 160 world props, essentially complete (2026-07-25, Opus)

Grew from 22 to **160** across one session — every world category except the ground itself.

**Late additions:** all 12 map markers, all 11 ability icons (the 3 `_lesser` variants DERIVED from
their base with `adjust.mjs` rather than generated — exactly the reuse that tool enables), the
larger projectiles, and every crypt tile in four themes.

**Projectile facing is load-bearing.** Only the javelin carries an `artAngleOffset` (+90°, art
points UP); every other projectile's art must point RIGHT, and each needs an aspect-matched canvas
or `artScale`'s min-axis fit squashes it (a 32×32 arrow would render 6×6, not 16×6). A size guard
now lives in `Projectile`'s constructor.

**Two bugs the console surfaced, not the eye:** `poi_ring_vein` was an orphan — that key doesn't
exist, the Gloaming Vein POI has no ring markers, so the art was silently doing nothing (repurposed
to `poi_ring_gorge`, which is real and was still placeholder). And `poi_floor_gorge` had been left
at the old trimmed 170px while its siblings were regenerated at 360. **Read the `[art]` console
warnings after a batch** — an unmatched key is invisible in-game.

**A verification trap worth remembering:** measuring `artScale` via a dynamic
`await import('/src/art/overrides.ts')` reported 1 for everything, because it returns a FRESH module
instance whose `placeholderSize` map is empty. The `[art] resized` warnings are the reliable
evidence that the real module recorded a key. Forest, badlands and bayou are all fully real
art now — terrain, flora with every `_picked` state, ore nodes, POI structures and POI ring markers
— plus crypt objects in all four themes and the first three real tiles (`crypt_floor`, `crypt_wall`,
`lodge_plank`) via `create_tiles_pro`. Left: themed crypt tiles, `poi_floor_*` decals, projectiles,
map markers, ability icons.

**Variants shipped where repetition showed most:** `tree_v2`, `boulder_v2`, `rock_v2`, and 3
silhouettes each for mesa spires, rockwalls and both badlands ores. Live spread confirmed the picker
works — trees 138/110, rocks 52/44, spires 11/20/15, sunscorch ore 32/29/29.

**Placement reworked twice off playtest feedback.** Decor clumps rolled their texture *per prop*, so
every clump was an even mix of all four types at identical density — the actual "too random" tell.
Then trees/branches/rocks/boulders moved off independent sampling (a uniform Poisson process, which
reads as artificial precisely because real terrain clumps) onto weighted clumping. Measured with the
Clark-Evans index: trees R=0.51, rocks R=0.66 (1.0 = random). Finally decoration was **anchored to
existing features** rather than scattered — 22% of features get dressed, 480 → 286 props, 99% within
50px of a real feature.

**Projectile got a size guard** even though its art is deferred: a gremlin rock is 6×6 against a
32px canvas floor, and `rotationOffset` means replacement art must keep the placeholder's facing.

The original 22-prop entry follows.

**22 of ~134 world props** were the first slice (`art/sprites/world/`), all forest: `tree`,
`ironbark_tree`, `boulder`, `rock`, `branch`, `bramble`, `blackberry_bush` (+`_picked`), `cattail`,
`decor_fern`/`_flowers`/`_mushrooms`/`_log`, `drying_rack`, `gremlin_shack` (+`_chest`),
`boss_altar`, `war_totem`, `gremlin_banner`, `palisade_stake`, `gremlin_camp_prop`, `camp_brazier`,
plus the first variant `tree_v2`. Badlands, bayou and crypt tiles are untouched.

**New tooling, all in `art/tools/`:** `trim.mjs` (dependency-free PNG decode/encode over
`node:zlib`) crops a sprite to its alpha box; `fetch.sh` downloads a job by id straight into
`art/sprites/world/` and trims it; `gallery.mjs` rebuilds the published reference page from whatever
is on disk, inlining every PNG as a data URI because the artifact CSP blocks external hosts. The
gallery is now **regenerated from the repo, not hand-assembled** — Phase 2's build scripts were
discarded after publishing, which is why this one is committed.

**`src/art/variants.ts`.** the user: props look too uniform. Dropping `art/sprites/tree_v2.png` is
now the entire change needed to add a second tree — same "add a PNG, it works" contract as the
override layer. Resolved in `ResourceNode`'s constructor (one hook, ~20 spawn sites) and selected by
hashing the prop's x/y, so appearance is stable across reloads without threading an RNG through the
samplers, and neighbouring props don't alternate in a visible stripe. `pickedTexture` follows the
chosen variant when `<variant>_picked` exists. `scatterDecorClustered` routes through the same
helper. `clearVariantCache()` in `create()` per the `scene.restart()` field-init rule.

**Blackberry-bush "disappearing" bug — caused by the migration, not the mechanic.** `harvest()`
worked correctly the whole time (node stays in `nodes`, active, visible, regrows). The bush had real
33×25 art while `blackberry_bush_picked` was still a 24×20 generated placeholder, so picking swapped
art *styles* mid-world and read as vanishing. Verified live via `preview_eval`.
**Rule: a `_picked`/`_shielded` state variant ships in the same batch as its base.**

**Warbow icons.** All three drew as sticks — the model reliably omits limb curve and string from
"longbow". `trim --report` is an objective acceptance test here: content 3-7px wide is a stick, a
real D-bow measures 16-30px. Prompting the *geometry* ("shaped like the letter D, thick curved limb
on the right, thin straight taut bowstring on the left") landed all three. **Same class of
known-hard prompt as the single-bit axe** — steer with shape, not with the weapon's name.

**Decisions recorded in the plan file:** animation scope widened to ambient motion (which fixes the
generation tool per asset, since a `create_map_object` result can never be animated); world props
may be authored larger than their placeholders but creatures may not; a 1-direction object costs 25
generations vs 1, so animatable props stay on the cheap path until the animation pass.

**Open:** `decor_log` reads as choppable but isn't (re-arted as inert mossy roots; the key wants
renaming in a later code pass), more decoration variety generally, and `boulder_v2`/`rock_v2` lost
to a PixelLab queue stall that pinned jobs at `95%` for 25+ min while still holding concurrency
slots — reported upstream.

### Phase 2 of the art arc — ALL 181 icons + UI resized + reference gallery (2026-07-25, Opus start / Sonnet finish)

Plan: `.claude/plans/art-textures-lighting-3-biomes.md` (Phase 2 — **now complete**). Operational
detail — the generation recipe, rate limits, hit rate, known-hard prompts — lives in
`art/README.md`, which is the file to read before starting Phase 3.

**All 181 icons shipped**, verified live in one final pass (181/181 overrides applied at 32×32,
zero console errors): raw materials, ores + ingots, the full four-metal weapon ladder (sword/pike/
warhammer/warbow across sunsteel/embersteel/gloamsteel/mirebronze), every tool tier, the full armor
progression (Gremlin set + duskhide/emberhide/bogweave/mirehide + sunsteel/embersteel/gloamsteel/
mirebronze helm/cuirass/greaves), all food/cooked dishes, all four relic rarities + every trophy +
refined-trophy tier, all jewelry (6 amulets, 7 rings, cloak, gloamdrinker, 3 ability gems), every
quest/ritual item (totems, effigies, sigils, the Gremlin King's heart), every station + all 4
Workbench tiers + the Smelter's tier, and all 4 status-effect icons.

**A second pass caught 3 icons that were generated but never landed on disk** — `mirebronze_ingot`
was downloaded onto `icon_mirebronze_helm.png` by a stale job-ID mixup (the real helm sat completed
and undownloaded the whole time), and `icon_cattail`/`icon_ring_sparkbound` were simply never
fetched despite their jobs finishing minutes earlier. All three were only found by diffing the
completed-file list against the authoritative 181-key manifest pulled from `BootScene.ts` — **don't
trust "not on disk yet" as "never generated" once a session has queued 50+ jobs**; always audit
against the full key list before calling a batch done.

**PixelLab's queue stalled hard partway through** — multiple jobs pinned at `creating 95% eta ~0s`
or cycling with a *growing* ETA for 20+ minutes at a stretch, well past the normal 60-90s, and this
happened on the paid Tier 1 plan, not just the earlier free trial. Reported upstream twice via
`agent_feedback`. Confirmed the `download` endpoint genuinely 400s at true 95% (`"still being
generated"`) — it is not silently complete, contrary to an earlier assumption. During one such
stall, built the reference gallery instead of idling (see below) — worth remembering as a pattern:
API stalls are a good moment to do the next deliverable's prep work, not just poll harder.

**Reference gallery**: a single self-contained HTML page — all 181 icons, grouped into 10
categories (materials/ores/weapons/armor/food/relics/jewelry/quest-items/stations/status), each a
magnified (2×) slot with a search box (matches name or key) and a "show not-yet-generated" toggle
that would surface gaps on a future partial run. Published as a Claude artifact and sent to the user
as a standalone file; **not part of the game repo** — it and the 3 generator scripts that built it
(`gen_gallery*.cjs`) were written to reference the live `art/sprites/` + `Items.ts` + `BootScene.ts`
data so the categorisation can't drift, then deleted once published (a one-off review tool, not a
shippable asset). Regenerate from scratch if a full visual audit is needed again — don't hunt for
the deleted scripts.

Below is the original 32-icon partial-batch writeup from earlier in the session, superseded by the
above but kept for the design decisions it documents:

**Icons are authored at 32×32, not the placeholders' 24×24.** 32 is PixelLab's minimum object
canvas and the better target anyway. That forced two code changes:

- **`Player.equippedIcon` normalises to a fixed world size** (`Player.ICON_WORLD_SIZE` = 24).
  It rendered item icons in the WORLD at native size, so 32px art would have silently scaled every
  held weapon up by a third. Verified: 24px placeholder → scale 1.0, 32px art → scale 0.75, both
  render 24×24. The swing tween had to change too — it reset to `setScale(1)`, which would have
  snapped a held weapon to full size mid-animation.
- **`applyTextureOverrides` splits icon resizes from sprite resizes.** Phase 1's warning says
  "reach/hitbox math reads sprite size", which is a false positive for UI icons — and at 181 of
  them it would bury a genuine warning on a world sprite in Phase 3. `icon_*` now reports as one
  info line.

**UI resized so the art is actually visible** (the user: "in game the icons are a bit small… let's be
proud of the arts"). The old 34px box showed 32px art at **×1.06** — the worst case for pixel art,
since nearest-neighbour keeps most rows 1:1 and doubles the occasional one, reading as distortion
rather than magnification. **Every surface is now an integer scale:** `InventoryMenu.SLOT` and
`HotbarUI.SLOT_SIZE` both 46→**70** with `ICON_BOX` **64** (**×2**, clean pixel doubling — these two
must stay equal so an item looks the same in the backpack and on the hotbar), and `CraftingMenu`'s
`LIST_ICON` **32** at **×1** (no resampling at all). The inventory grid went **6→7 cols, 15→10
rows**: the vertical budget is fixed (the panel must clear the hotbar at y=900), so bigger slots buy
fewer rows and the extra column claws the capacity back. Measured after: panel x 16..1182 / y
48..878, columns at 28-554 / 578-800 / 824-1000 / 1024-1170, clear of both the hotbar and the
crafting panel at x=1284. The ability bar needed no change — it derives from
`hotbarUI.left + width`.

**The crafting list already had icons** — at `iconSize` 18 against placeholder art they just read as
coloured smudges. Now 32px at 1:1, with icon and name both centred on the row (`ROW_H` 25→36), since
anchoring either to the row top left them visibly out of line once the icon was taller than the text.

**Locked decision — tier ladders now DIFFER on purpose.** The plan required a ladder to read as one
object in different metals. The real four-metal sword ladder came out as four distinct silhouettes,
and the user reversed the rule: *"I like the swords like that."* A higher tier reading as a visibly
different weapon is the stronger progression signal. Load-bearing — it means every icon is an
independent generation, with no `create_object_state` chaining and no shared-silhouette constraint.
It also invalidates Phase 4's inherited "metal tiers are recolours" note, flagged in the plan for
re-deciding on its own merits.

**Corrected two of my own critiques mid-session.** I called out a green matte fringe on `icon_stone`
and anti-aliasing on `icon_relic_common`; the pixel data disproved both (zero opaque green pixels —
the outline is `#202A1B`, a dark olive-black; zero semi-transparent pixels anywhere; 15-48 colour
palettes). Output is genuinely clean pixel art and **needs no post-processing step**.

**Throughput reality for the remaining ~150:** PixelLab caps at **4 concurrent jobs** (a 5th is
rejected outright), so it's ~45 rounds of 4. Progress % is unreliable — jobs pin at `95% eta ~0s` or
reset to 0% with a *growing* ETA, then finish fine; don't re-fire on a stall (reported upstream via
`agent_feedback`). Hit rate ~85%; misses are the model over-decorating, steered with
*plain/undecorated/torn*. **Single-bit axes are a known-hard prompt** — three attempts all gave a
symmetric double-head or a curved pick; `icon_stone_axe` ships as the best of three.

the user moved off the 40-generation trial to **Tier 1 (2,000/mo, $12)**, so cost is no longer a
constraint on the arc — 181 icons + Phase 3's ~134 props is ~16% of one month.

