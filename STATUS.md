# Status

## Current State

_Living snapshot — edit in place, never append._ Last shipped: **Phase 2 of the art arc COMPLETE —
all 181 icons + the UI resized around them + a reference gallery** (2026-07-25, Sonnet, continuing
Opus's same-day Phase 1/2 start) (`.claude/plans/art-textures-lighting-3-biomes.md`). Every one of
the 181 icon textures is now real pixel art in `art/sprites/`, verified live in-game (181/181
overrides applied at 32×32, zero console errors). **Phase 2 is done — next is Phase 3 (~134 world
props: flora, structures, crypt tiles), then Phase 4 (player rig).**

Icons are authored at **32×32**, and every UI surface renders them at an **integer** scale —
inventory and hotbar slots went 46→**70** (`ICON_BOX` 64, ×2) and the crafting list draws its icon
at 32 (×1). The old 34px box showed them at ×1.06, which reads as distortion rather than
magnification. The inventory grid went 6→7 cols / 15→10 rows to fit. `Player.equippedIcon` now
normalises to a fixed 24px **world** size, so icon resolution can never change how big a held weapon
looks.

**A searchable reference gallery exists** — published as a Claude artifact and sent to the user as a
standalone HTML file (not part of the repo; it's a one-off review tool, generated then discarded
along with the scripts that built it). Groups all 181 by category (materials/ores/weapons/armor/
food/relics/jewelry/quest items/stations/status), filterable by name or key, with a light/dark
theme. Regenerate by re-running the same category-map + assembler approach if a full re-review is
ever needed again (scripts were `gen_gallery*.cjs` + `gen_gallery_categories.cjs`, deleted after
publishing — recreate from scratch rather than hunting for them).

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
stat caps, shrine budget, boss pacing** (2026-07-24, Opus; full writeup under Recent Entries).
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

### Art pipeline + additive coloured lighting (Phase 1 of the 3-biome art arc) (2026-07-25, Opus)

Plan: `.claude/plans/art-textures-lighting-3-biomes.md`. First session of the real-pixel-art arc
(roadmap 8). the user registered the **PixelLab MCP** at project scope; its tools need a session
restart, so this session built the foundation everything else gets authored against. Two forks
locked via `AskUserQuestion`: **additive coloured lights** (not Lights2D + normal maps, which would
need a normal map for all 377 textures that PixelLab can't generate) and **icons first**.

**Measured the real scope** from the live `TextureManager` rather than parsing BootScene — many
keys are drawn by shared helpers, so static parsing only resolved 107 of 314 calls. **377 authored
textures**: 181 icons (177 @ 24×24, 4 status icons @ 22×22), ~134 static world props/flora/nodes/
structures/crypt tiles, ~24 creatures + player, 14 derived `*_elite` recolours, 12 map markers @
18×18, 3 FX gradients. The other **2,197** keys are runtime RenderTextures (ground bakes, minimap,
tile fills) and stay procedural. **~327 of 377 never animate**, so static art is the finished
product for them, not a stopgap — this corrected an earlier assumption that animation gated
everything.

**`src/art/overrides.ts`** — drop `art/sprites/<textureKey>.png` and it replaces the generated
texture of that name with **zero call-site changes** (Phaser keys are plain strings). Discovered via
Vite `import.meta.glob` at build time, so there is no index file to drift the way `RECIPES.md` does;
adding a PNG is the entire workflow, and deleting it restores the placeholder. `BootScene` gained
its first-ever `preload()`; overrides apply after `makeTextures()` and before MainScene starts.
It **reports size changes** (attack reach and hitboxes read sprite size — `MainScene.enemyReach`,
`Enemy.reachBonus`) and **unmatched keys** (a misspelled filename would otherwise fail completely
silently). `pixelArt: true` was already set, so loaded PNGs are crisp with no extra work.

**Additive coloured lighting.** `NightOverlayUI` was subtractive *only* — it filled the screen dark
and erased soft holes, so every light source looked identical no matter what its comment claimed. The
existing code promised "doorways glow with their gem's color" and "a bile-green hole breathing
light"; `ScreenLight` carried no colour at all, so that intent was never deliverable. Added a second
RenderTexture rendered with `BlendModes.ADD` — it **can't** fold into the darkness mask, because
drawing colour into a layer that renders normally would occlude the world instead of lighting it.
`ScreenLight.color` is **optional**: omit it and behaviour is byte-for-byte the old pure reveal,
which is what a discovered crypt ROOM wants (plainly lit, not bathed in colour). New `LIGHT_COLOR`
in MainScene assigns per-source hues across all 14 light sources.

**`ADDITIVE_STRENGTH` is 0.15, and the number matters:** additive blending *sums* overlaps and light
sources cluster hard — a Gloaming Vein is 9 crystals inside one radius. At 0.4 the cluster saturated
straight to white and lost the violet, i.e. the exact colour the pass exists to add. Also note the
brush is shared between the erase and additive passes, and **erase strength reads the brush's
alpha** — so the erase loop resets `clearTint().setAlpha(1)` explicitly. Verified the brush is left
tinted at 0.15 after render, which is what makes that reset load-bearing rather than defensive.

**Verified live** (not just typechecked): built three throwaway PNGs to exercise the override path
end-to-end — a correct-size one applied and changed real pixels (`icon_wood` → magenta), a
wrong-size one fired the resize warning, a bogus key fired the unmatched warning, and a
non-overridden key was untouched; fixtures then deleted. Lighting confirmed by screenshot at deep
night: the vein reads amethyst with crystals and ground visible through it while POI fires read warm
amber in the same frame. Day hides **both** layers (zero cost). `tsc` clean, zero console errors.

**Scope locked same-day (the user), and it deleted the hardest problem:** **armor does NOT render on
the model** — only its inventory icon and stat lines. So there is no armor layer, the
`inpaint`-separable-layer question is moot, and no metered API calls are needed to settle it. **The
weapon DOES render**, and **each of the 5 survivors gets unique art + animations**. Rig volume drops
~6× to **~300 frames**: 5 survivors × 4 dirs × ~13 frames (~260) plus weapon-in-hand at **10
ARCHETYPES** × 4 dirs (~40) — the roster is ~25 weapons but only ~10 shapes, since the
sword/pike/warhammer/warbow ladders are the same object in four metals (recolours, same principle as
the 14 `*_elite` textures). Because armor is invisible, **the weapon is now the only visible signal
of gear progression**, so the metal recolours need to read clearly distinct. Note the display
mechanism already exists — `Player.ts`'s `equippedIcon` offsets by facing every frame and has a
swing lunge tween; Phase 4 replaces its art and anchors it to a per-frame hand joint (which
`animate-with-skeleton`'s `skeleton_keypoints` hands over directly). Added **Phase 5 — ability cast
FX**: all 8 families (`blink`/`nova`/`lifelink`/`aegis`/`gravebind`/`haste`/`lance`/`snare`)
currently reuse the `light_soft` gradient as one generic glow, so they're visually
interchangeable; the new additive light layer is directly reusable there.

**Next:** Phase 2 — the 181 icons, starting with normalising the four 22×22 status icons.

### Reaver-run playtest batch — stat caps, shrine budget, boss pacing, telegraphs, UI fixes (2026-07-24, Opus)

No plan file — a fix/rework batch off the user's Reaver win (69:56, 936 kills, level 31, score
19170, 62/62 relic rolls). **14 of 15 items; the 15th is a design decision surfaced in
Current State, not a fix.** Every design fork was locked via `AskUserQuestion` first, and two of the
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
