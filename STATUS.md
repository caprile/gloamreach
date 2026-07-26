# Status

## Current State

_Living snapshot — edit in place, never append._ Last shipped: **ground texturing + biome
blending** (2026-07-25, Opus) (`.claude/plans/art-textures-lighting-3-biomes.md`).

**The art migration now covers every surface in the game.** The GROUND was the last piece and
the only non-reversible one — it is generated, not a sprite, so the override layer can't reach
it. It is now real 32px pixel art: `src/ui/GroundDetailUI.ts` keeps a 2304px chunk of stamped
tiles around the player (constant cost at any world size) drawn *over* the existing colour
field, which still owns every biome boundary and POI floor stamp. 10 materials across the three
biomes, 28 tiles. the user's three live notes all landed: real water in the forest creek, a
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

the user's call on elites: the recolour is "good for now". Bespoke elite art is a possible later
pass, and since `eliteVariants.ts` skips any elite key that was itself overridden, dropping in a
real `<name>_elite.png` simply wins.

**Next, in the user's stated order:** (1) **AOE / attack FX art** — the Cinderwrought's cinder
cone, the Gloamwarden's ground spikes and the rest of the telegraph footprints, all currently
procedural `Graphics`; (2) **on-theme inventory and crafting menu art** (`create_ui_asset` for
panel/slot frames, buttons, tabs); (3) a **unique in-game cursor** (`input.setDefaultCursor`,
worth a hover/attack variant given the game is mouse-driven). Also
still open from the user's earlier notes: a stouter/gobliny gremlin (the humanoid rig reads too
human; custom proportions came out worse, so it needs a different approach) and the ~19 ambient
props that need regenerating as objects to animate.

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

### Ground texturing + biome blending (2026-07-25, Opus)

The last non-reversible piece of the art migration, and the one the user deliberately queued
last: the ground is *generated*, not a sprite, so the override layer can't reach it.

**The constraint that shaped everything.** The ground has always been a per-pixel COLOUR
field — `worldBiomeColorAt` composites base + biome blobs + features into one number. That
gives correct, smoothly-blended colour at any world size but can never carry pixel-art
detail: outside the forest it is baked into 4096 texels stretched over a 28000px world,
about 7 world px per texel, and a world-sized TileSprite is ~3GB (it OOMed once already).
So the plan's two candidate routes were "replace the bake with tile stamping" or "keep the
colour and overlay a texture", and the second is what shipped — but as a **moving chunk of
real 32px tiles at 1:1**, not a flat detail wash.

**`src/ui/GroundDetailUI.ts`** keeps a 2304px chunk of stamped tiles around the player
(double-buffered, snapped to a 576px grid, ~21,000 stamps rebuilt over 9 frames at ~2.5ms
each). Cost is constant at any world size, which is the same reason the camera-locked
`ground_speckle` layer it replaces existed. It is **purely additive**: tiles draw
semi-transparently over the colour field, so every biome boundary, POI floor stamp, minimap
colour and map reveal still reads the exact same source. It also means one clay tile serves
the whole badlands palette instead of needing a tile per colour.

**`src/systems/ground.ts`** (Phaser-free) owns the material vocabulary — 10 materials, their
variant counts, per-material opacity and placeholder colours — and **`WorldBiomes.worldGroundMaterialAt`**
answers which one covers a point, built from the same fields in the same priority order as
the colour so texture and colour can never disagree about where a creek or a mesa is.
Placeholder tiles are still generated in BootScene, so the layer works with no art at all.

**Three things the user's live feedback changed mid-build:**

1. **"The woods river doesn't look like a river."** Correct — the "shallow creek water over
   pebbles" prompt had come back as bare grey gravel with no water in it at all. Re-rolled
   with an explicit ripples/caustics/flowing prompt and took the blue-water candidates,
   toned 0.82.
2. **"Some of the blending between areas isn't great."** Colour blends across a seam and a
   tile can't — a cell is one material or the other, and a smooth curve cut that way is a
   staircase. Fixed with **two probes per cell**: a jittered primary (so the edge dithers
   into an interlocking band rather than running along cell lines) and a far-flung secondary
   that reaches across the seam and lays the neighbour on at half strength. One mechanism
   softens every boundary in the world — blob borders, creek banks, mesa edges — with no
   per-boundary code.
3. **"Can't the tiles be smaller, to give easier blending of curved lines?"** Yes, without
   halving the ground's pixel resolution against every other sprite: the art stays 32px and
   is carved into quadrant frames (`src/art/groundFrames.ts`), stamped on a **16px** grid.
   A cell keeps the quadrant and variant its 32px block would have used, so four cells of
   one material reassemble that tile pixel-for-pixel — only the material *decision* gets
   finer, which is exactly where the resolution was wanted.

**Two new art tools, both from bugs this pass hit.**
`check-seam.mjs` scores how well a tile actually TILES, by comparing its wrap edges to its
own interior steps. That caught `ground_grass_1` at **x10.8** — a hard horizontal line every
32px across the whole forest that looked perfect in a viewer. Roughly a third of every
tiles-pro batch fails it. `seamless.mjs` then *repairs* a marginal wrap instead of re-rolling
for one: it measures the edge difference, halves it, and fades that correction inward, so
the texture's own detail is untouched and only the low-frequency drift that IS the seam goes
away. Repaired tiles score x0.00. Without it the bayou would have been stuck with its
third-choice mud, since only one muck candidate in 32 wrapped cleanly.

**One regression caught in verification:** the War Camp's packed-dirt floor and the Gloaming
Vein's blighted floor are stamped into the colour bake, so the new layer painted grass
texture straight back over them and the camp stopped reading as a cleared campground. The
layer now takes a **material callback** rather than the `WorldBiomes` instance — POI floors
are the scene's knowledge, not the world map's, so `MainScene.groundMaterialAt` composes the
two. (The badlands POI decals needed nothing: those are real decal objects at depth -7,
above this layer.)

**Verified live** (`preview_eval` + screenshots): quadrant frames registered on real art;
sprinting 300 frames never leaves the chunk uncovered; a cross-world teleport rebuilds in
the SAME frame (a blink stays on the cheap path, so the two are distinguished by whether
the chunk still covers the camera, not by distance); a crypt entry is outside the world
circle so the layer correctly draws nothing underground; camp/vein floors resolve to their
own materials with the surrounding forest unaffected. `tsc` clean, no console errors.

**Removed:** the `ground_speckle` layer and texture, plus the `syncCameras` special case it
needed. Its own comment said it existed because the outer world had no detail — keeping it
would only have put a second 32px grain pattern over the first.

**Not done, deliberately:** the tiles are static, so water does not animate. Ground
animation belongs with the ambient-prop animation pass, not here.

### Creature art pass 2 — gator Mirejaw, ghost Corpselight, per-creature attacks (2026-07-25, Opus)

Three playtest notes off the animated roster, all art-layer only — **no code changed**, `tsc`
clean, and every fix is a PNG swap the existing loaders pick up.

**1. "The alligator looks like a dog."** It did. The Mirejaw was a quadruped `create_character`
whose description ("gloam-gator") never named the anatomy that makes a gator a gator, and the
skeleton — which controls the pose but not the shape — filled in a retriever. Regenerated as
**Mirejaw v2** (`lion` template) with the anatomy spelled out: *huge long flat toothy snout, body
pressed low and flat to the ground on short splayed legs, very long thick tapering tail, no fur*.
One generation, unmistakably an alligator. **The lesson is cheap to reuse:** the skeleton is the
pose, the description is the animal.

**2. "It should be biting, not clawing."** The old attack was a paw-swipe. The quadruped set has
`jump-attack` — a lunging strike with the jaws open — which is both the right verb and a match for
the Mirejaw's actual in-game Lunge. Verified frame-by-frame and live: it now closes and chomps.
The Miretyrant was checked too and left alone; its custom attack already turns front-on and opens
its jaws.

**3. "The Corpselight used to be a cool ghost, now it's a humanoid."** Also correct, and
structural rather than a bad roll: a humanoid `create_character` **always has legs**, so a legless
floating swamp-haunt could never come out of that path. It now ships as a **static
`create_map_object`** — a tattered shroud under a glowing wisp-head, matching the placeholder
the user liked — and its three strips were deleted. Nothing was lost: `Corpselight.bobPhase`
already rides rotation for a hover, so it reads as floating with no animation at all, and a walk
cycle on a thing with no legs was the wrong ask from the start. Joins snake and sandmaw as
**deliberately static** (so: **19 of 22 animated**, 3 static by design). Two variants were
generated and the narrower shroud-plus-flame-head one was installed as the closer match to the
old art; the broader hooded version is the alternative if the user prefers it.

**4. "The attack animations feel a bit repetitive."** The cause was a single line in the original
recipe: *humanoids use `cross-punch`*. Twelve visually distinct creatures all threw the same
punch. Each now plays the attack it actually performs — **`throw-object`** for the Gremlin (which
closes the standing "the ranged gremlin needs a real rock-throw" backlog item),
**`pull-heavy-object`** for the Palewake's drain tether, **`hurricane-kick`** for the Kilnborn's
radial backdraft, **`two-footed-jump`** for the Gremlin King's leaping smash, and so on; the full
table is in `art/README.md`. Murkling deliberately keeps `cross-punch` as the swarm baseline —
it's no longer the shared default, just one creature's attack. Cost was **~12 generations total**
(a template animation is 1 generation and only one direction is generated), which is why this was
worth doing properly rather than tolerating.

**Process note worth keeping:** re-fetching a creature rewrites *all three* strips plus the static
sprite from whichever direction is passed, so idle/walk were backed up and restored after each
fetch. Only the attack strip is new — nothing else could regress.

Verified live: all 11 touched textures load at the expected sizes, the 19 animated creatures
register idle/walk/attack, elites derive correctly from the new art (including the recoloured
animation strips), and a spawned Mirejaw was caught mid-lunge with its jaws open.

### Creature animation + the UI slim-down (2026-07-25, Opus)

**20 of 22 creatures animated** (96 animations) via `src/art/creatureRig.ts`.
Snake and Sandmaw stay static on purpose — neither fits the humanoid or
quadruped skeleton, and both are ambushers whose read is stillness.

**Route:** `create_character`, not objects. `create_1_direction_object` was
piloted and rejected — 25 generations each, a 64-candidate review per creature,
loose style match. A character is 1 generation, and quadrupeds have a real
`attack-right` template. **Only ONE direction is generated**, and it is a
per-ANIMATION choice: **idle faces front, movement and attacks face side-on.**
A profile throws away the ears/face/held item that identify a humanoid; a
front-facing walk cycle moonwalks. Template sets differ per skeleton and have to
be read per creature (cat has no attack — the toad's is `jump`).

**Bugs the real art exposed, all invisible under symmetric placeholders:**

- **`applyFacing` takes a VELOCITY.** Ten call sites passed a unit vector, which
  is under its near-stopped threshold, so facing never updated and the creature
  kept its constructor's random `flipX` forever. `faceAngle()` — the documented
  fix — was broken the same way: it forwarded a unit vector into
  `applyUprightFacing`, which has its own `|vx| > 3` guard. Fixing the ten sites
  first and measuring **no change** is what surfaced the second layer.
- **Bosses never played their attack animation.** They resolve damage through
  `checkPlayerHit()` and never touch the shared `attackPhase`, so `isAttacking()`
  was always false. Now marked at `beginExecute`. `markAttackAnim()` takes no
  `now` — a window stamped on a caller's clock and compared against
  `scene.time.now` never expires.
- **Bosses recovered facing away.** A travelling attack (leap/charge/roll)
  carries the boss PAST the player and `updateRecovering` couldn't see the
  player at all, so it spent its whole punish window staring the wrong way.
  **The measurement mattered**: assuming a stationary boss reported a vague
  9/40, while checking against its ACTUAL relative position each frame localised
  it to executing 19/28 and recovering 9/29. Recovering and idle now measure 0.
- **HP bars sat over the sprite** — `BAR_OFFSET_Y` was a flat 16px from the
  sprite's CENTRE, fine at 14-32px and wrong at 48-68px. Now derived from the
  sprite's own height; the two boss poise bars follow the same value.

**Panels slimmed off the play area** (placement clicks were landing on the
inventory): Q/E/R stacked, Destroy under the last special, Combat under
Equipment, Relics moved to a tab — 1166 → 774 wide against a player at 960.
Crafting 620 → 480, sized to the tab strip and the quantity slider.

**Idle wandering calmed**: rest 4-9s against a 1-2.5s stroll, and past 90px from
spawn the next stroll aims home, so creatures hover their anchor instead of
random-walking off it.
