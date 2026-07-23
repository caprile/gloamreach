# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **Batch C — data-driven bayou
rebalance** (2026-07-23, Opus, no plan file), guided by the Balance Audit built just before it.
Headline structural fix: **enemies now inherit the terrain move-slow the player suffers** — in deep
bayou water the player wades at 50% but enemies used to ignore it entirely (verified live: an enemy
in a 0.6 cell now has `envSpeedMult 0.6`), which was the #1 "can't run away from anything in the
bayou" cause. Applied at the single `updateEnemies` envSpeedMult choke point (bounded — only active
near-player enemies), and the player's dash stays terrain-exempt so it still escapes. Enemy tuning
(edited in the single source `enemyStats.ts` + each entity **wired** to read it, so the audit and
game can't drift): **Murkling** 172→118 speed (was faster than sprint = un-kiteable) + claw 62→38;
**Mirejaw** 138→108 + lunge 120→80 / chomp 85→52; **Mosswretch** smash 135→78 (elite 202 one-shot
killed); **Corpselight** orb 34→22 magic + homing turn-rate 1.9→1.2 (dodgeable); **Blighttoad** bite
66→44 + poison 6→4/stack (3-stack cap already existed); **Miretyrant** (win-con boss) attacks bumped
(52-58 → 82-95, so armor stops nullifying it to -1/-2) + poise 450→800 & regen 24→28 (kills the sword
perma-stagger) + HP 4600→3600; **Palewake/Kilnborn/Sanguinarch** crypt wardens 240-300→420-440 (were
4-hit trivial). **Fenlurker CUT entirely** (the user: boring burrower) — entity file deleted, removed
from all spawn tables + the dev spawn table + the module. Verified live: every changed value flows
through (Miretyrant poise 800, Murkling dmg 38, terrain slow 0.6), `tsc` + `npm run build` clean,
zero console errors. **All forest + bayou entities now read the module; badlands still mirror the
code** (wire them when next tuned — module WIRING STATUS block tracks it).
**Batch B — POI overlap FIXED (2026-07-23):** a shared `tooCloseToAnyPoi(x,y,POI_MIN_SEPARATION)`
check is now enforced in every POI picker (den / tyrant-altar / bayou), so no two different-type POIs
land within 800px (was: badlands pickers enforced only their own ~200-360 clear radii, bayou pickers
avoided only a subset — hence Cinder-Forge-on-Warren, Duneshaper-altar-next-to-Sunken-Gorge). Verified
live: min cross-type POI distance **803px** across 73 POIs, all 30 dens still placed (den guard tries
80→160). The redundant partial `clearsOtherPois` was removed. **The enemy-border-bleed half is only
partly addressed** (POIs no longer cluster at borders; `steerEnemyHome`'s 800px leash still lets an
enemy stray ~800px into a neighbouring blob — full biome containment deferred).
**Batch D quick wins + cloak-slot separation — DONE (2026-07-23):** (1) **Resting regen scales with
campfire level** — `updateComfortRegen` now sets `hpPerSec = 1 + campfireTier` (Lvl 1→1, Lvl 2→2, …)
from the nearest campfire fuelling the Bedroll. (2) **Gremlin Shirt → heavy armor** (`Items.ts`) — the
earliest heavy piece, so a biome-1 player has an on-ramp to heavy-armor magic/fire mitigation + heavy
XP; Cap/Pants stay light (deliberate mixed set). (3) **Poison no longer halves HP regen** —
`currentRegenMult` = `env.regenMult` only; the miasma/mire ZONES still cut regen (terrain hazard), but
a creature's poison dose is now just a DoT (status tooltip + "Weakened Healing" indicator updated to
match). (4) **Cloak → its own equip slot** — new `cloak` `EquipSlot` for stat back-armor (Mireborn
Cloak moved there), while `back` stays the R-ability cape slot (relabelled "Cape"); a utility cloak no
longer evicts your R ability. Paper-doll auto-flows (11 slots still 4 rows at 3 cols, no overflow);
passives aggregate over `EQUIP_SLOTS` so the cloak's `statusResistPct` still applies. All verified live
(`tsc` + `npm run build` clean, zero console errors).
**Economy questions — RESOLVED (2026-07-23):** (a) **bayou crypt wardens (Palewake/Kilnborn/
Sanguinarch) now drop a guaranteed `refined_trophy_uncommon_t3`** — completing the miniboss refined-
trophy ladder (Gloamwarden T1 / Cinderwrought T2 / crypt-warden T3); added `refined_trophy_uncommon_t3`
to the `ResourceType` union (was roll-only). (b) **Bayou elites ~2× more common** (new
`BAYOU_ELITE_CHANCE_MULT = 2`, ~8%→16%, verified live at 15.6% surface) — elites feed the relic loop
and read as "really rare". (c) **Mire Shards** already have a source — the deep but functional chain
Relic Forge Lvl 2 (Gloam Conduit → refine) → Lvl 3 Ember Kiln (Gloam→Ember) → Lvl 4 Mire Crucible
(Ember→Mire); left as-is (works), just undiscoverable — a future hint could surface it.
**Mini-boss big HP bars — DONE (2026-07-23):** the five mini-bosses (Gloamwarden / Cinderwrought /
Palewake / Kilnborn / Sanguinarch) now feed the big top-of-screen `BossHealthUI` while engaged
(the user: "fire guy's health bar is missing" — the floating world bar was too easy to lose). Done via
a scene-side `engagedMiniBoss()` **adapter** (no edits to five entity files): HP + name off base
`Enemy`, `isEngaged`→`isAggro()`, and the poise strip shows **only** for one that exposes a poise
meter — the others pass `poiseMax 0` and render HP alone (`BossHealthUI` now hides the empty strip).
Big bosses still take priority. Verified live: Kilnborn shows "The Kilnborn" 440/440 HP-only bar, no
poise strip; zero console errors.
**Themed bayou spawns — DONE (2026-07-23):** a soft zone/water preference in `pickBayouPoint`
(`preferZone`/`preferWater`, enforced for the first ¾ of attempts then relaxed so a spawn never
fails) biases each species to its macro-zone. Verified live: **Murkling 90% hammock** (reed-bed
swarms), **Blighttoad 95% miasma** (poison frogs in the poison fog — the creek "lilypad" water was
too sparse to congregate on, so they went to the abundant + thematic poison zone), **Mosswretch 78%
bonemire** + **Corpselight 47% bonemire** (husks & haunts in the drowned boneyard), Mirejaw favours
the wet miasma/water. **This clears the ENTIRE ~45-item 2026-07-23 playtest dump** — every item
across continue-on-death, Batch A (12 fixes), the Balance Audit tool + Phaser-free enemy-stat
extraction, the systematic bayou rebalance, POI-overlap, Batch D, the cloak-slot separation, the
economy fixes, mini-boss HP bars, and now themed spawns is shipped + verified. **Next: a full
playtest** — all the rebalance/spawn/economy numbers are first-pass and want real play.
Prior: **Balance Audit dashboard tab +
Phaser-free enemy-stat extraction** (2026-07-23, Opus, no plan file). Built BEFORE the bayou
rebalance (the user's call) as the objective tool to guide it. New **`src/systems/enemyStats.ts`** — a
Phaser-free single source of truth for every enemy's combat stats (HP, per-attack damage + class +
cadence, move/burst speed, poise, scale, resistances, elite mults, biome), extracted from the entity
classes. The **entities now READ from it** (forest roster — Boar/Snake/Gremlin×2/GremlinKing — fully
wired + verified behavior-preserving in-game; badlands/bayou values mirror the code today and get
wired as each is next tuned, tracked in the module's WIRING STATUS block). The dashboard's new
**Balance Audit** tab (`/dashboard.html`) imports it live and computes the four ratios the playtest
complaints map to, color-coded red/amber/green against thresholds anchored to
[[feedback_size_enemies_against_player]]: **Kite** (enemy speed ÷ player sprint), **Hits-to-die**
(player HP ÷ damage-taken-per-hit, armor/mitigation applied), **TTK** (enemy HP ÷ resist-adjusted
player DPS), **Stagger** (enemy poise ÷ player dmg/hit, ⚠ if poise-DPS outpaces regen), across three
documented player checkpoints (Start/Mid/Geared). It objectively confirms the complaints: **Murkling
kite 1.25 (outruns your 138 sprint)**, **elite Mosswretch hits-to-die 0.8 (a literal one-shot)**,
**Corpselight 30 magic bypassing armor**, and the boss "-1/-2" being physical damage eaten by armor +
the 75% reduction cap. Extraction is Phaser-free (esbuild: 9.7kb, 0 Phaser refs); `tsc` +
`npm run build` clean; dashboard verified rendering with correct ratios + zero console errors. This
already surfaced real drift in the old hand-mirror (it claimed Cinderwrought resists blunt/pierce —
code resists nothing; called Hexling magic-resistant — it's magic-WEAK). **Next: the actual bayou
rebalance (Batch C), now data-driven.**
Also this session (detail above / in `### playtest-batch-2026-07-23`): the **Balance Audit dashboard
tab + Phaser-free enemy-stat extraction** that guided Batch C, **Playtest batch A (12 quick bug/UI
fixes)**, and the **continue-on-death test-mode button**. Still open from the ~45-item dump: **Batch B**
(POI/biome-border
overlap), **Batch D leftovers** (poison→regen-halving removal; resting scales with campfire level;
themed bayou spawns; Gremlin chest → heavy armor), the **cloak→R-slot** separation (locked: give
back-armor its own equip slot), trophy/elite-rarity + **Mire-Shard source** economy questions, and
**mini-boss big HP bars** (Cinderwrought/crypt wardens — differing second-meters, folds into a
boss-feel pass).
Prior: **B4-P6 — Perf regression
(display-list streaming), culled-enemy drift, 5 playtest fixes** (2026-07-22, Opus, no plan file —
a fix batch). The headline is a **structural perf fix**: the world had grown to **17,041 display
objects**, all of which Phaser iterates every frame and re-sorts whenever any depth changes — i.e.
every frame the player moves, which is exactly why the hitching only showed up while
walking/sprinting. Measured 22.3ms/frame with the sim *paused*. `updateSceneStreaming()` now parks
anything that can't be on screen out of `scene.children` (physics/AI/animation untouched):
**17,041 → ~1,550 objects, 22.3ms → 9.3ms**. Second: B4-P4's AI distance cull never stopped the
enemy it skipped, and Arcade velocity has no drag — so a creature culled mid-chase **coasted across
the map forever**, which is why Warren dens got stuck on wave 1 (guards alive but thousands of px
away), why gremlin camps looked unguarded, and why badlands Duskrunners turned up in the starting
forest. Fixed at the cull, plus a `homeX/homeY` leash that walks strayed **idle** enemies back.
Also: light-bearing jewelry now actually sheds light (its % multiplied a torch radius that was 0),
the craft-toast stack is capped and repacked instead of climbing off-screen, `WORLD_ZOOM` 1.25 →
1.5, and every `src/ui` font is +2px with the coupled layout constants adjusted. Verified live
throughout — panel overflow checked by measuring real text bounds, not by eye. `tsc` +
`npm run build` clean, zero console errors. A **second batch** in the same session cleared four
older items: the Sunken Gorge's **second maw was unusable** (reach was measured against maw #1, so
the other door gave no prompt and ate the click — this is what blocked the user's effigy run);
surface enemies can no longer be inside a dungeon (**hard invariant** now, since CRYPT_REALM sits
in the world square but outside the world circle, so the geometry permitting it is permanent);
dungeon transitions **snap the camera and fade up from black** instead of easing 14000px across the
world in full view; and the Ironshod Pickaxe finally has its own tier art like the axe. A **third
batch** then made **no character start with any gear** (`startingItems` emptied on all five — the
ability-granting `startingEquip` is untouched, since that *is* the class's ability, not gear;
verified the bare-handed opening still unlocks the Woodcutter's Axe off ground pickups) and split
the **upgrade-unlock toasts** by what the unlock buys: stations and tools keep theirs, gear ladder
rungs are logged silently. Same saturated inventory went from **88 toasts to 14**. **Next: a
playtest** — the zoom, type size, home leash and streaming window are all first-pass numbers.
Prior: **B4-P5 — Gear branching, set
bonuses to jewelry, pickaxe gate, Gemwright UI** (2026-07-22, Opus, plan
`.claude/plans/b4-p5-gear-branch-and-jewelry.md`). **Gear now branches**: Sunsteel was a dead end
(Gloamsteel reforges from an *Embersteel* piece), so a new bayou-grade **Mirebronze/Bogweave**
route reforges straight from Sunsteel/Duskhide. Both routes terminal; armor sits deliberately
between the tiers (heavy 20-32-**36**-42, light 15-24-**26**-30) so the longer Embersteel road
stays stronger. **Gloamsteel now costs Moonsilver** — crypt-warden-gated, which is what makes the
Embersteel route the dungeon-clearing one; seams 3 to 4 to cover demand. **All four set bonuses
moved off armor onto jewelry** (same effects, same numbers), which frees armor to be pure flat
armor and is what makes branching balanceable; the rule inverted to "highest rank worn" since each
bonus is now self-contained. New **Ironshod Pickaxe** (Sunsteel + Ironbark, badlands-crafted) gates
Bog Ore — the bayou's only surface ore, so it gates the whole bayou metal economy. **Gemwright**:
ability designs show a **Q/E/R badge** (derived from the item's slot), and gem setting moved out of
the shared Upgrade panel into a **Set Gems tab** with a live effect+cost preview. Two asks needed
no work and were reported as such: heavy-armor mitigation already covered fire and poison, and
armor already had no resistances or stat bonuses. Verified live and in Node; `tsc` +
`npm run build` clean. **Next: a playtest** — especially whether ~120 Moonsilver covers Gloamsteel
*and* the four new jewelry pieces in one run. See B4-P5 below.
Prior, older milestones (full entries in STATUS-archive.md — grep by id): **B4-P4** 25-item
playtest omnibus; **B4-P3** class skill affinities + stat potency; **B4-P2** epic loot pool +
lesser starter abilities; **B4-P1** start-of-run character picker; **B3-P5** post-boss Mythic
choice; **B3-P4d(1/2)** the bayou surface POIs + the Miretyrant lair; **B3-P4c** Sunken Crypts,
the dungeon mechanic; **B3-P4b** the bayou creature roster; **B3-P4a** bayou terrain/poison;
**B3-P3** bayou reforge tier + gem augments.

**In progress / next.** The **biome-2 (Sunscorch Badlands) umbrella is COMPLETE** (all 6 phases 0–5 —
patchwork worldgen through the relic rework; the badlands is a fully populated second biome with a
4-enemy roster, POIs, the Duneshaper — now a MID-boss, see below — and the smelting/forging gear +
tier-2 relic tiers). The
current arc is the **biome-3 (haunted bayou, working name "Duskmire Bayou") + new-systems roadmap**
(`.claude/plans/biome-3-and-new-systems-roadmap.md`, 5 phases). **Shipped so far:** **Phase 1**
(terrain-that-matters + badlands macro-zones), **Phase 2a** (the activated-ability framework + Dota
QER HUD), **Phase 2b** (the jewelry-effect pipeline + the Gemwright's Table), **Phase 3** (the bayou
gear progression — gem augments + the Gloamsteel/Mirehide reforge tier), **Phase 4a** (the
bayou's terrain, environment and material sources), **Phase 4b** (the creature roster), **Phase 4c**
(the Sunken Crypts dungeon mechanic), and now **all of Phase 4d** — **PHASE 4 IS COMPLETE**. It ran
to four sessions (the Dungeon mechanic was added mid-4a): **4a terrain/env/surface-sources — DONE**;
**4b — the melee-core roster** (Mirejaw / Blighttoad / Mosswretch / Murkling / Fenlurker + the one
ranged Corpselight haunt) — **DONE**, which sourced **Mirehide** and re-enabled the bayou's respawn
top-up; **4c — DUNGEONS — DONE** (6 themed Sunken Crypts; the 3 ability gems + Moonsilver finally
have a source, hard-gated behind a bespoke warden per gem); **4d — surface POIs + the Miretyrant**,
itself split in two, **both DONE**: session 1 (the Sunken Shrine + Drowned Lodge + the Tyrant Sigil /
Gorge Bone key materials) and session 2 (the **Miretyrant**, its own boss-level dungeon behind the
sealed Sunken Gorge, and the **win-con swap** — the Duneshaper is now a mid-boss and its **Heart**
is obtainable, unlocking the Gemwright's ability recipes). **Phase 5 — DONE**: the post-big-boss
reward choice, delivered as a **boss-trophy 3-Mythic pick inside the Relic Forge** rather than the
umbrella's kill-time modal (the user's redirect — see B3-P5). **THE BIOME-3 + NEW-SYSTEMS UMBRELLA
IS COMPLETE (all 5 phases).** The first post-umbrella milestone, **B4-P1 (start-of-run base
character)**, has now shipped. **Both of the roadmap's deferred "Later" sub-phases are now
done** — B4-P1 was one; the other, **RNG dungeons with build-defining miniboss drops**, was
already delivered by **B3-P4c (the Sunken Crypts)** and should not be re-planned as new work
(the user flagged this 2026-07-22 — it had been mistakenly listed as open). 4c satisfies it in
full, RNG included: `pickCryptPositions()` shuffles both the six crypt POSITIONS and their
THEME assignment off `sessionRng()` every run, each of the three themes is gated by its own
bespoke warden (Palewake / Kilnborn / Sanguinarch), and the ability gems + Moonsilver are hard-
gated `shielded` behind that kill — so *which crypt you clear decides which build you get*,
and which crypt is near you varies per run. **Genuinely open and unplanned:** a **biome-3
playtest/balance pass** (the bayou arc has never been played end-to-end — crypts, POIs, the
Miretyrant, the Mythic pick), **save/load** (roadmap item 8), and real pixel art/animation
(deliberately last). The five characters' stats/kits/modifiers are all first-pass and expected
to need tuning once they're actually played.
Ability/jewelry numbers and everything biome-3 are first-pass/tunable. The master-plan tail
**M-TE** (trophy-gated gear) is folded into the shipped biome-2 work; real pixel art/animations stay
deliberately deferred until content/balance settle (roadmap item 8).

**Dev tooling (2026-07-13, Sonnet):** `window.__dev` browser-console commands for playtesting without a
full playthrough — `god()` (still takes damage/knockback/shows real damage numbers, just floors HP at 1
and never dies), `heal()`, `nobuildcost()`, `setstat(name|"all", value)`, `spawn(name, elite?)`,
`give(key, count?)` (drop any item into the backpack — B3-P2a, the way to obtain the ability specials),
`killall(radius?)`, `exploremap()`, `list()` (dumps valid skill/stat/enemy names), plus a
`run("spawn duneshaper")`-style one-line parser. DEV-build-gated (`import.meta.env.DEV`, new
`src/vite-env.d.ts`) — unreachable in a production build. `nobuildcost` also fixed a real latent bug: the
Crafting/Cooking/Upgrade menus each computed their own greyed-out/affordability state independently of
MainScene's cost gates, so the first ship only fixed the click-to-craft path, not the menu display —
the user hit this immediately (craft button stayed greyed with nobuildcost on). See the Recent Entries
below + [[survivor-rpg-dev-console]].

**Known issues / open.**
- Boss may be slightly overtuned after the 5s damage bump (the user's "TBD" — left as-is
  since the harder feel was wanted). 5t cut the smash AoE 120→95 so it's movement-dodgeable;
  dash i-frames confirmed working against it.
- Enemy shove-knockback is near-cosmetic — `Player.update()` zeroes idle velocity each
  frame; deferred to a combat-feel pass.
- No save/load beyond the high-score table; all run state is in-memory only.
- The dashboard **Enemies tab is the one hand-mirrored data source** — keep it in sync
  when tuning enemy stats (everything else on the dashboard is imported live).
- **World Y-sort depth is compressed** (`systems/depth.ts` `ysortDepth` = `y * 0.09`,
  shrunk when the world grew to 28000px in biome-2 Phase 0) so world objects stay below the
  fixed HUD. Max-world-y depth 28000×0.09 = 2520, clear of the 2600 HUD floor. Any NEW world
  object that Y-sorts by position must use `ysortDepth(y)`, not raw `y`. **If the world grows
  further, shrink this again** (invariant: `WORLD_SIZE × scale < 2600`).
- **A world-sized `tileSprite` is out-of-memory** and must never be recreated. Phaser
  TileSprite allocates a canvas its own size; at 28000² that's ~3GB → boot OOM (this bit us
  this session). The grass tilesprite now covers only the forest region (`BIOME_SIZE`); the
  outer ground is a single bounded `bakeOuterOverlay` RenderTexture (`OVERLAY_TEX` 4096²,
  LINEAR-filtered, stretched over the world — constant GPU cost at any world size). Never size
  a tilesprite/RenderTexture to the whole world.
- **Forest blobs + a wider badlands band have content now (PB1 Session 3); dunes + the true deep
  frontier are still empty.** The forest disc holds the biome-1 roster/POIs; **forest patchwork
  blobs beyond `BIOME_RADIUS` also now get a (lighter) content pass** via `pickOuterForestPoint`;
  the badlands patchwork holds the Duskrunner/Cragscale/Hexling/Sandmaw roster + Emberbloom/Sunfruit
  flora out to `BADLANDS_R_MAX_OUTER` (8500, was 5200) via `pickBadlandsPoint`. Dunes and everything
  beyond ~8500-9000 is still terrain only, deliberately reserved for a future biome.
- ~~**Enemy respawn top-up is forest-species-only, biome-agnostic.**~~ **FIXED (2026-07-13)** —
  `makeRespawnEnemy` now picks the roster from the biome at each chosen spawn point
  (`worldBiomes.dominantBiomeAt`): forest/base → the forest mix, badlands → the badlands mix
  (Duskrunner/Cragscale/Hexling/Sandmaw), dunes → nothing (empty placeholder). See the entry below.

## Recent Entries

> Older entries in STATUS-archive.md.

### playtest-batch-2026-07-23 — continue-on-death + the triaged remaining work (Opus)

A ~45-item bayou-heavy playtest dump. Triaged with the user; **continue-on-death shipped first**
(above / Current State). Locked directions: **systematic** bayou rebalance (not targeted nerfs) —
measure enemy speed/HP/damage against the player's real envelope per
[[feedback_size_enemies_against_player]]; **remove the Fenlurker** (burrower) entirely. The rest is
Sonnet-class fixes/tuning. The full remaining list, grouped:

**Batch A — quick bugs/UI — SHIPPED (2026-07-23), except two deferred (cloak→R-slot design call;
mini-boss big HP bars → boss-feel pass). See Current State for the per-item detail.** enemy HP bars render dark-red for some enemies; campfire recipe text
cut off past the box; relic "replace"/dominance modal text overlaps (needs wrap + auto-sized boxes);
dungeon chests not glowing; a cloak going into the R (ability) slot wrongly; Smelter should return
loaded items to inventory on close (like the ask that drove the Smelter-fix entry — verify it does);
bayou miniboss (Cinderwrought / "fire guy") big HP bar missing; workstations should show the yellow
upgrade-triangle while in the hotbar; "Set Gems" tab hard to see + **weapons not appearing in Set
Gems**; poison damage bypasses the overshield (should chip it, like other damage); never grant a
**duplicate special item from a box**; rename Sunken Gorge **or** Sunken Forge (too similar);
smelting simplify to **1 Wood per ore** (the user — supersedes the 2/3/3/3 just shipped).

**Batch B — world/POI overlap:** Cinderwrought (Sunken Forge) overlaps a Warren; Duneshaper altar
spawning in the bayou next to another POI / next to the Sunken Gorge (flagged twice); badlands↔bayou
**border bleed** — POIs too close, enemies crossing biomes. (Root cause is almost always a missing
spawn-exclusion zone — [[feedback_poi_busy_not_placeholder]] — and POI-position pickers not honoring
each other's clear radii + biome coverage.)

**Batch C — bayou combat rebalance (the big one):** enemies far too fast (can't kite/dodge/run from
anything — even god-mode-only survivable); wild power disparity (some ~no HP, some 1-shot); Corpselight /
ranged haunts do insane damage AND **don't stop to shoot** (AI bug — they should plant like a Hexling);
ranged gap-close makes player ranged unplayable; elite Mosswretch nearly 1-shots; heavy armor doesn't
feel tanky + poison stacks (~6) melt you + even max Embersteel gets owned; **Miretyrant does ~nothing
(−1/−2 dmg) and perma-staggers to a sword**; Palewake dies in ~4 hits (trivial) — bosses feel weak
while trash 1-shots; Reaver takes too much damage / lesser Bloodpact too weak (consider passive
lifesteal or a buffed innate); **new weapons' stamina cost too high** (attacks-per-weapon feels flat
despite stat investment); trophies/elites feel rare in bayou; "where are the guaranteed Uncommon T3
miniboss trophies?"; "where do I get Mire Shards?" (surface the source or add one). Also: themed bayou
spawns (toads at the lilypad POI, ranged at the docks); make the Gremlin chest piece heavy armor.

**Batch D — design tweaks:** remove poison's regen-reduction, make a regen-cut an enemy-kit thing
instead; resting regen buff scales with campfire level; Palewake fight-clarity pass (reads as unclear /
not epic).

### Smelter fix — unloadable alloy recipes, reagent/fuel split (2026-07-23, Opus)

Off a playtest report: "why can I put Bog Ore and Hex Essence into the Smelter but it doesn't
do anything?" Two problems, one visible and one behind it.

**The bug.** Fuel became per-recipe in B4-P5 (Gloamsteel takes Moonsilver, Mirebronze takes Bog
Ore), but `ProcessingStation` still assumed one shared fuel key — `fuelKey()` returned the *first*
fuelled recipe's key (`hex_essence`) and `canAcceptFuel()` compared against only that. So the fuel
slot **refused Moonsilver and Bog Ore outright**, making Gloamsteel and Mirebronze impossible to
smelt at all, with the failure showing up as a silently-zero slider and no explanation. This is the
classic shape of a bug that near-identical duplicated code produces, which is why the rewrite below
routes both secondaries through one parameter instead.

**The design problem behind it.** Fixing the lookup surfaced that "Fuel: Moonsilver" reads as nonsense —
the slot was never really fuel, it was a generic "A + B → output" ingredient slot, named for its
first case. Worse, once Hex Essence stopped being universal, the two B4-P5 alloy recipes were
smelting metal **with no heat source at all**. the user proposed a third slot; locked via
`AskUserQuestion` on the variant where **all three slots are always required**, which is *less*
complexity than an optional one (nothing to special-case in the slider/process math):

- `ProcessRecipe.reagent` — the second ingredient that ends up *in* the ingot, per-recipe.
- `ProcessRecipe.fuel` — burned off, never part of the output, **always Wood** on every recipe.
  Gives Wood a sink that outlasts the early game.

| Input | Reagent | Fuel | Output |
|---|---|---|---|
| Sunscorch Ore | 1 Hex Essence | 2 Wood | Sunsteel Ingot |
| Cinderforged Ore | 1 Hex Essence | 3 Wood | Embersteel Ingot |
| Bog Ore | 1 Moonsilver | 3 Wood | Gloamsteel Ingot |
| Sunsteel Ingot | 2 Bog Ore | 3 Wood | Mirebronze Ingot |

**Implementation.** The two secondaries behave identically apart from which recipe field and slot
they touch, so `usesSlot`/`slotKeys`/`slotKey`/`canAcceptInto`/`addInto`/`takeFrom` all take a
`side: SecondarySide` rather than existing as two copies. `maxPossibleOutput` caps by the min of
all three slots. **`process()` checks both secondaries before spending either** — consuming them
in one pass would let a fuel-short run eat the Moonsilver on the way to returning null.

**Layout** (`DryingRackMenu`, which serves both stations): row 1 is Ore + Reagent side by side —
the two that end up in the ingot — with Fuel on row 2 below, so the grouping says which is which
before you read a caption. Panel 400 → 448. Captions still come from the recipe
(`Ore`/`Metal`, `Reagent`/`Alloy`); Fuel is always "Fuel", being the one ingredient that never
changes role. Two new amber hints explain a zero slider: `Needs Moonsilver` (wrong item) and
`Needs 3 each` (right item, too few).

Also fixed in passing: destroying a placed Smelter refunds all three slots (it dropped input +
fuel, so the new reagent would have been swallowed), and drag / right-click / Ctrl-click quick-load
route a stack to whichever secondary slot accepts it.

**Verified live** (`preview_eval` against the running dev server): full Gloamsteel run with correct
remainders (2 ore / 2 Moonsilver / 6 Wood), Mirebronze's 2-per and 3-per costs, cap = min of all
three, fuel-starved run leaves input and reagent intact, both hint cases, slot type gating (Wood
can't go in reagent, Moonsilver can't go in fuel), Drying Rack unchanged (one slot, 4 Cattail → 2
Twine), and panel content measured to fit — which caught the lengthened Smelter description
wrapping to a third line and colliding with the slot captions. `tsc` clean, zero console errors.
`RECIPES.md` smelting table updated (it was doubly stale — it listed Bog Ore as taking Hex Essence
and omitted Mirebronze entirely).

### B4-P6 — Perf regression (display-list streaming), culled-enemy drift, 5 playtest fixes (2026-07-22, Opus)

Off a the user playtest: seven complaints, of which two shared one root cause and the biggest was
structural. No plan file — a fix batch, not a milestone.

**1. The hitching (the headline).** "Very common hitching while sprinting/walking feels bad." Not
gameplay code — the **display list had reached 17,041 objects** (5,293 miasma fumes, 2,355
dungeon-wall rects, 2,233 resource nodes, 1,138 enemies, and every decorative prop in three
biomes). Phaser walks that whole list every frame to cull and render, again in `syncCameras`, and
**re-sorts all 17,041 whenever any depth changes** — which is every frame the player moves, and
never while standing still. That is exactly the reported symptom. Measured in the live game:
**22.3ms/frame with the sim PAUSED**; a full `depthSort` alone was 2.35ms; hiding 5,293 sprites
saved only 3ms (invisible children are still iterated) while *removing* distant ones from the list
dropped the frame to 4.1ms. So the fix is removal, not visibility:
**`MainScene.updateSceneStreaming()`** parks every world object that cannot possibly be on screen
out of `scene.children` and into a `streamedOut` array, re-adding it when the player comes back.
Nothing else changes — Arcade bodies live in the physics world and `Sprite.preUpdate` runs off the
scene's update list, so **collision, AI and animation are untouched**; this is purely "don't ask
the renderer about things it can't draw". Runs every 250ms with a 900px margin past the viewport
(derived from `cameras.main.worldView`, so it tracks any zoom change automatically). The
`isStreamable` predicate deliberately excludes HUD (`scrollFactor 0`), ground bakes/decals
(`depth < 0` or >900px), and **every `Graphics` object** — those draw in absolute world coordinates
from a transform parked at (0,0), so their x/y says nothing about where they appear (verified: all
216 streamable Graphics sat at 0,0). Result: **17,041 → ~1,550 in the list, 22.3ms → 9.3ms median
while sprinting**, with `update()` itself at 0.6ms and the streaming pass 0.85ms per *250ms*. A
12,000px round trip over 80 passes restored exactly the same 115 nearby objects, so nothing leaks
or vanishes; parked objects that die meanwhile are dropped via the `scene === undefined` that
`destroy()` leaves behind.

**2 & 3. Duskrunners in the forest / dens stuck on wave 1 (one bug).** "I can't kill duskrunners so
the elite wave isn't spawning so I can't break the thing", plus "stuff is wandering way too far"
and "missing spawns on some gremlin camps" — all the same defect. B4-P4's AI distance cull
`continue`s past 2000px **without stopping the enemy**, and Arcade velocity persists with no drag,
so an enemy culled mid-chase (or mid-pounce, at 330px/s) **coasted in a straight line for as long
as the player stayed away**. Warren guards and shack guards flew off their POI permanently — a den
whose guards are alive but 5,000px away can never clear wave 1, which is precisely the blocker
reported. Fixed at the cull site (zero the body on the way out), plus a backstop: base `Enemy` now
records `homeX/homeY`, and `MainScene.steerEnemyHome()` walks a **non-aggro'd, non-attacking**
enemy back at 34px/s once it strays past 800px. It's a post-`update()` steer exactly like
`steerCryptEnemy`, so **no subclass wander code changed**, and gating on `isAggro()` means it can
never bend a live chase or a committed lunge. Verified live: a culled enemy's velocity goes to
(0,0); a strayed idle one steers home; an aggro'd one at the same distance still chases at full
speed; all 30 dens hold 90 guards and all 14 shacks hold both, none more than 70px out.

**4. Light-bearing jewelry did nothing.** `lightRadiusPct` only ever *multiplied* the held-light
radius, which is 0 with an axe in hand — so the Amulet of Farsight's "pale lantern-stone" lit
nothing at all unless you were already holding a torch. New `EquipmentEffects.innateLightRadius()`
derives its own glow from the same percentage (so one number still describes the piece) against a
200px base, deliberately under a torch's 180px so a torch stays the brighter option; `collectLights`
takes the **max**, not the sum. Verified: 0 → 80px world radius with no torch held.

**5. Toasts drifting off-screen when crafting fast.** The left-hand recipe/material stack used a
monotonic upward cursor **with no cap**, so a burst of crafts (each toast holds ~7s) marched
straight off the top of the screen and left holes at the bottom as older ones faded from under it.
Rewritten to match the center stack it sits beside: keep each container, cap at 6, evict the
oldest, and `relayoutRecipeToasts()` repacks from the baseline on every add/evict/fade.

**6. Zoom + text size.** "My guy looks so tiny — did the camera zoom out?" `WORLD_ZOOM` 1.25 → 1.5
(visible world 1280x720). "Text is too small in menus" — the 1920x1080 canvas is FIT-scaled *down*
into a browser window, so a 12px font lands near 10px. Bumped every `fontSize` in `src/ui` by 2px
(74 sites) and the layout constants coupled to those metrics (`EventLogUI`/`KeybindsUI` line +
header heights and its 34→29-char truncation, `CraftingMenu` row height, `InventoryMenu` section +
relic-effect row heights). MainScene's own world-space text (damage numbers, boss name cards) was
left alone — the zoom already enlarges it. **Verified by measuring real `getBounds()`** against
each panel rect rather than by eye: crafting, inventory (74 texts, stocked), character (both tabs),
pause, tips, welcome, world map, character-select cards, and the campfire/relic-forge/gemwright
station menus all render with **zero text past any panel edge and nothing off-screen**.

`tsc` + `npm run build` clean; zero console errors. **Every number here is first-pass** — the zoom,
the 800px home leash, the 250ms/900px streaming window and the +2px type all want real play.

**Second batch (same session)** — four more items the user flagged as predating the above.

**7. The Sunken Gorge's SECOND maw was dead** ("I built an effigy and couldn't interact with the
boss dungeon opening"). Nothing to do with guards: `promptForGorge()` measured reach against
`lair.x/lair.y`, which is only ever **maw #1**, so standing at the other door gave no prompt and
the click fell straight through. The lair deliberately has two doors into one interior (B4-P4), and
they were ~9,200px apart in the test seed. `hoveredGorge` now carries `{ lair, maw }` so reach —
and the hover highlight, which had the same bug — measure against the door actually under the
cursor. Verified end to end from maw #2: prompt → break seal → descend.

**8. Enemies in the dungeons.** The `CRYPT_REALM` pocket sits in the dead corner of the world
**square**, which is inside `collideWorldBounds` even though it's outside the world **circle** the
player is clamped to — so anything that travelled far enough simply arrived there, and the
now-fixed coasting bug (#2 above) supplied the ~14,000px. Since the geometry that permits it is
permanent, this is now a **hard invariant** in `updateEnemies` rather than a consequence of
movement behaving: anything not in `cryptEnemies` found inside either underground rect
(`insideUndergroundRealm`, covering CRYPT_REALM and LAIR_REALM with a 600px margin) is snapped back
to its spawn. Verified by dropping a surface Boar into the crypt pocket — one tick and it's home.

**9. The dungeon transition.** "You can clearly see the camera moving to the other area." The
camera follows with **lerp 0.1**, so teleporting the player ~14,000px underground made it *ease*
the whole way — and the existing 260ms `flash` couldn't hide a pan that long. New
`transitionCameraTo()` does both halves: `centerOn()` kills the in-flight travel outright, then a
**420ms fade up from black on BOTH cameras** (world-only would leave the HUD floating over black)
reads as a scene change instead of a jump cut. Verified: on entry and exit the camera is already
within 1px of the player, and both fade effects run.

**10. Ironshod Pickaxe art.** The tier-art mechanism was already generic (`tieredStationTexture`
looks for `<icon>_t{n}`) — the pickaxe simply never had one drawn, so it kept its base icon while
the axe changed. Added `icon_stone_pickaxe_t1`, drawn to match the Ironshod Axe (sunsteel head,
bright bevel, gold haft bands) so the pair reads as one upgrade family. Verified the resolver
returns the tiered key for both tools and still falls back to base for an item with no tier art.

**11. No character starts with gear.** Three of the five handed out an axe (the Warden a pickaxe
too), which quietly made the class pick partly a decision about how fast you got through the
opening minutes — and it made the Ascetic's empty hands, its entire stated identity, not actually
special. Every `startingItems` is now `[]`. **`startingEquip` is untouched**: that is the
ability-granting special item, which by B4-P1's locked decision 4 *is* the class's ability rather
than gear in any ordinary sense — stripping it would delete Q/E/R from every card. Knock-on edits,
all of which follow from the roster being uniform: the Ascetic's blurb no longer says "starts with
nothing but nerve" (it leans on Hunted instead), the card's KIT section is **skipped when empty**
rather than printing "Nothing but nerve" on all five, and the picker subtitle no longer promises "a
different kit". The field itself stays — it's the obvious lever for a future unlock or difficulty
option, and `applyCharacter`'s routing already handles both cases. **Checked the opening isn't a
dead end**: bare-handed, ground branches + rocks unlock the Woodcutter's Axe immediately (along
with Torch/Wood Club/Campfire/Workbench), so every run bootstraps the same way it always did before
a starting axe existed. Verified all five spawn with an empty hotbar and backpack.

**12. Upgrade-unlock toast flood.** Weapon/armor upgrades are ladders — dozens of rungs across the
gear tiers — and learning one common material unlocks a whole column of them on the same frame.
Measured on a saturated inventory: **88 "New Upgrade Unlocked!" toasts**, which is the unruliness
the user hit. Split by what the unlock actually buys, per his call: a **station** upgrade or a
**tool** upgrade grants a capability you did not have (a new recipe tier, a node you couldn't fell)
and keeps its toast; a **gear** rung is only a bigger number on something you already own, so it is
now logged with `EventLog`'s existing `silent` flag. The entry still lands in the scrollable Log
and the rung still appears in the Upgrade menu — only the popup is gone. Same flood now yields
**14 toasts** (12 stations + the 2 Ironshod tools) and **74 silent**, with all 74 still in
`discoveredGearUpgradeIds`. Applying an upgrade still announces normally; that's one deliberate
click, never a burst.

**13. Character picker type.** The project-wide +2px font bump (#6) missed this menu almost
entirely — `CharacterSelectUI` sizes its type by passing **numbers** to its own `text()`/`block()`
helpers rather than writing `fontSize: "Npx"` literals, so the sweep found exactly one site in the
file. Worth remembering for any other UI built that way. Bumped ~25% across the card (labels 10→13,
body 12→15, ability 13→16, name 18→22, title 26→32, button 20→24) — but type alone would have made
it *worse*: bigger text in a 272px card just wraps into more lines, so the card gets taller and
narrower rather than more readable. Card width 272→330 and the panel 1500→1780 moved with it (still
a 70px gutter each side of the 1920 canvas), plus every paired line-step. Panel height then
re-measured against real bounds rather than guessed: cards run 519px, leaving the Begin Run button
55px clear. Verified all five cards at 330×519 with zero text past any card edge and nothing
off-screen.
