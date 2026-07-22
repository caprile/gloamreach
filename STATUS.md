# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **B3-P4c — Biome-3 Phase 4c: Sunken
Crypts, the DUNGEON mechanic** (2026-07-22, Opus, plan
`.claude/plans/biome-3-phase-4c-crypts.md`). The payoff for 4a's locked surface/dungeon split:
`moonsilver` + the 3 ability geodes had been pulled off the surface and had **no source at all**
until now — so every jewelry recipe and all three Q/E/R abilities were unreachable. **6 crypts, two
per gem theme, 5-7 rooms each.** Interiors are a **pocket of the same world**, not a second Scene:
prebuilt at `create()` in `CRYPT_REALM`, the dead corner of the world SQUARE that lies outside the
world CIRCLE (measured 15488px from center vs `WORLD_RADIUS` 14000). New framework-free
`src/systems/CryptLayout.ts` carves rooms + L-corridors on a 32px grid and returns **merged
horizontal wall runs** (601 static bodies across six dungeons instead of ~1800). `activeCrypt` gates
everything that must not run underground — player clamp, map reveal + minimap, surface respawns,
nightfall surge, dawn cull — and `NightOverlayUI` gained an **underground mode at 0.94 alpha** so a
crypt is pitch black past your torch (at night's 0.42 you could see the next crypt's floor across
the void); interior braziers are per-crypt so a neighbour's 7 in-range lights don't hang glowing
beside you. **The materials are hard-gated on the encounter**: vault geodes + moonsilver seams spawn
`shielded` (the Gloaming Vein mechanic) — no prompt, un-mineable — and crack open only when that
crypt's warden dies. **Three bespoke wardens with three genuinely different state machines** (locked
by the user: not one skeleton with new numbers, and different from every previous mini-boss, none of
which reuse the shared poise-bar punish): **Palewake** (gloam — a stalker that's untargetable while
stalking; its ONLY opening is **breaking its drain-tether with a wall or pillar**, a dodge verb that
exists only because we now have interiors), **Kilnborn** (ember — a **heat meter that rises as it
acts**, setting its own vault floor alight; the backdraft sweeps the burning ground so the dodge is
**standing on cold tiles**, and the punish window arrives on the boss's clock), and **Sanguinarch**
(blood — **the player sets its phase**: its feed only lands if you're bleeding, buying it a heal and
you a fat `engorged` punish window; stay clean and it never opens up). Verified live end-to-end
(walls hold, sealed→cracked→mined, all three warden loops incl. cold-vs-burning ground and
bleeding-vs-clean feeds, zero spawns inside a crypt, containment); `tsc` clean, zero console errors.
**Next: 4d — surface POIs + the Miretyrant boss (the new win-con).** See B3-P4c below +
[[survivor-rpg-biome-3-roadmap]].
Prior: **B3-P4b — Biome-3 Phase 4b: the
Duskmire Bayou creature roster** (2026-07-22, Opus). Six bespoke melee-core creatures + one
deliberately uncommon ranged haunt, dropped into 4a's terrain. Locked with the user up front: the
**specced 6**, **Mirehide from the Mirejaw ONLY** (hunting the gator IS the reforge gate), and
**build the homing projectile now**. Two shared hooks first: **`Enemy.pendingPoison`** (the
`pendingBleed` contract exactly, routed to `PoisonManager.apply()` — the discrete **stacking**
path, not the miasma's refresh-only `sustain()`) and **`Projectile.homing`** (re-aim velocity by
at most `turnRate·dt` each `preUpdate`, plus a **required** `maxLifetimeMs` — the default
despawn measures distance *from spawn*, which a curving orb never trips, so it would orbit
forever). The six: **Mirejaw** (130 HP, sole Mirehide + the bayou's meat; lurks VISIBLE at alpha
0.4, locked-line lunge chomp 85+bleed, then **surfaces and hunts** rather than re-burying);
**Blighttoad** (poison carrier — the bite is eaten by plate, the **stacking armor-bypassing
poison** is the payload, and it halves healing so you can't eat your way out); **Mosswretch**
(190 HP bruiser, slowest enemy in the game + the longest wind-up — and **the roster's FIRE
lesson at ×1.5**, the biggest weakness on any common enemy); **Murkling** (22 HP swarm, the
**AOE-arc payoff**, wide pack-aggro on the base-state pattern, deliberately neutral to every
damage type); **Fenlurker** (burrowing ambusher shipped alongside the Sandmaw because **the dodge
verb is opposite** — ring vs **locked line** — and its resists are the **exact inverse of the
Mirejaw**, so the two bayou ambushers want different weapons); **Corpselight** (the ONE ranged
creature, the game's first **homing** projectile — 110px/s, 1.5 rad/s, 4.2s lifetime, magic —
plus the bayou's **local Hex Essence** source, so Gloamsteel no longer means walking back to the
badlands). **358 creatures** spawn clustered-per-species via `pickBayouPoint`, with cluster jitter
now **re-checking biome per member** (an improvement on the badlands spawner, which can leak over
a seam); the bayou **respawn top-up is live** (4a had it gated off), Mirejaw-weighted so the
Mirehide tier stays farmable. 3 new materials + 6 elite trophies at **Common / Tier 3** (×2.25) —
**roll-only** until a tier-3 shard currency exists (4c/4d), exactly as biome-2 was pre-Ember.
Verified live: locked lunge dealt 85 standing still and **0 when sidestepped**; poison **stacked
6→12→18→24 while the miasma held flat at 3**; one woken Murkling **cascaded to all 5**; the orb
re-aimed at exactly its turn cap and **expired at 4224ms**, hitting for **20 through 42 armor vs 1
untyped**. `tsc` clean, zero console errors. Dashboard Enemies tab + `RECIPES.md` trophy table
updated; no recipe changes. **SAME-SESSION TUNING PASS (the user):** the roster was sized against the
badlands roster, not a bayou-ready player — who **sprints 166-229px/s, dashes 450, blinks 220px and
hits for 45-70 (130-200 crit)**, against a roster whose fastest was 104px/s and tankiest 190 HP, i.e.
**outrunnable at a walk and dead in two swings**. Speeds ~1.7-3×, HP ~2.5-3×, damage up to matter
through bayou plate (measured net through a full Gloamsteel set: Mosswretch smash 63 / Mirejaw lunge
52 / Fenlurker maul 44 ≈ 4 hits on a 220 HP player, all telegraphed); the **Corpselight orb went from
a ~460px leash to ~1500px** (170px/s × 9s — still under a sprint, so running straight still escapes);
the **Mirejaw gained "stalk patience"** (a real bug: its slow stalk meant a merely-walking player could
never be ambushed — it fell 537px behind and never engaged; after 2.4s it now abandons stealth and
hunts); and the **gator sprite is now the biggest common creature** (74×34 on screen).
Prior: **B3-P4a — Biome-3 Phase 4a:
Duskmire Bayou terrain, environment & material sources** (2026-07-22, Opus, roadmap
`.claude/plans/biome-3-and-new-systems-roadmap.md`). Phase 4 was **sliced into three sessions** by
the user: **4a = terrain + environment + sources (this)**, **4b = the melee enemy roster**, **4c =
POIs + the Miretyrant boss + the win-con swap**. The bayou is now a real walkable, harvestable third
biome, and every material that shipped **dormant** in Phases 2b/3 finally has a world source.
Locked this session: water **slows by depth, never blocks**; the bayou boss **will** become the new
win-con (4c); and **`poison` is a SUBTYPE OF MAGIC** — a new `IncomingDamageType` that bypasses flat
armor and takes the *same* heavy-armor magic mitigation (new `Weapons.isMagicFamily()`), while adding
its own identity: it ticks over time and **suppresses HP regen**. New `src/systems/Poison.ts`
**composes** `BleedManager` and exposes two modes — `apply()` (discrete stacking dose, for 4b's
creatures) and `sustain()` (continuous environmental source, refresh-don't-stack). New
`src/systems/Bayou.ts` palette + `bayouWaterAt()`; `WorldBiomes` gained **bayou at tier 3** (unlock
6500) and **demoted the content-less Dunes placeholder to tier 4** (10500, deep frontier);
`pickBayouPoint` mirrors `pickBadlandsPoint` with an `avoidDeepWater` option; `BadlandsZone` was split
into a shared **`ZoneShape`** so 14 new **miasma zones** (regen-suppressing + 3 dps poison — the
Phase-1 env hook's real payoff) reuse `zoneEdge`/`drawZoneFloor` verbatim. **443 nodes:** cypress/
mirestone/driftwood/shellrock (universal wood/stone), **Bog Ore** 46, **Moonsilver** 22, and **three
separate geodes** (9 each) that each drop one specific ability gem — one node per gem, honoring
Phase 2b's "gem source dictates build". New Swamp Moss + Water Lily flora (persistent, no recipes
yet). **Two real bugs caught in verification:** the water slow used a raw coverage cutoff instead of
*dominance* (edge water didn't slow; the badlands DRY RAVINE did), and the miasma stacked to the cap
(3 dps became 15 and killed an idle test player) — both fixed and re-verified. Palette also gained a
uniform **gloam wash** after it composited olive and read as "more green biome": now forest `#3f6a36`
/ badlands `#755f39` / bayou `#44454b` / dunes `#cab47e`. Verified live; `tsc` clean, zero console
errors. **SAME-SESSION REDIRECT (the user):** the **most precious materials moved off the
surface** — the 3 ability geodes + Moonsilver are now **dungeon-only loot** (a Valheim
burial-chamber/sunken-crypt mechanic, added to the arc as its own phase); **Bog Ore stays
surface-mineable** so the reforge tier is still reachable by exploring. Their textures/node shapes
are KEPT for the dungeon phase to re-site; the gems + moonsilver are dormant again meanwhile. To
keep the surface characterful, `BayouZone` widened to **three themed macro-zones** (6 each):
**miasma** (poison + halved regen), **bonemire** (bleached dead-tree boneyard, 0.62 slow), **hammock**
(raised cypress island, no penalty + the densest foraging). Per the user the **miasma is very common
and large** — 46 zones at avg r 652 (vs 8 each of the others), placed first and allowed to merge into
big fog banks, covering **34.8% of the bayou** with 62.4% left clear; measured, not guessed, and at
no FPS cost. Also new: **`src/ui/StatusBarUI.ts`**, a
**generic debuff strip** above the buff bar (poison/bleed/slow/no-regen — bleed had NO HUD tell since
the badlands), timed effects get a meter + countdown, conditional ones just show; No Regen is
suppressed while poisoned as redundant. **Poison's regen penalty is 50%, not a block** (the user):
`blockRegen` became a `regenMult` multiplier end-to-end (`BuffManager.tick` included), the miasma
zone moved to the same 50% (a full block would have made the rule unobservable, since miasma is the
only poison source), sources take the MIN not the product, and Comfort's double-penalty bug was
caught + fixed. Verified: +19.4 HP over 9.69s in a miasma under a food buff vs +19.4 expected. **Deliberately left out:** **Mirehide** (a *creature* hide —
lands with 4b's roster, not a node), and the bayou is gated out of the enemy-respawn/nightfall top-up
until 4b ships. No `RECIPES.md`/dashboard change. See B3-P4a below + [[survivor-rpg-biome-3-roadmap]].
Prior: **B3-P3 — Biome-3 Phase 3: Bayou gear progression (reforge tier + gem augments)**
(2026-07-21, Opus) — gem augments (mix-and-match, consumed, max 2/instance) reusing the existing
per-instance `upgrades` field + `UpgradeMenu`, plus the Gloamsteel/Mirehide reforge tier, Workbench
Lvl 5, Gloamsteel Arrows and the lifelink Gloamdrinker. Authored dormant; **4a now sources its Bog
Ore + gems**; 4b's Mirejaw now sources Mirehide. See B3-P3 in STATUS-archive.md.
Prior, in brief (full entries in STATUS.md's Recent Entries or STATUS-archive.md — grep by id):
**B3-P2b** jewelry-effect pipeline + the Gemwright's Table (a different effect layer from relics);
**B3-P2a** the Q/E/R cooldown-only, equipment-granted ability framework + Dota-style HUD bar;
**B3-P1/P1a** terrain-that-matters — large themed macro-zones + the generic `environmentEffectAt`
env hook; **PB18** backpack armor-upgrade fix + reforge-returns-to-slot.

**In progress / next.** The **biome-2 (Sunscorch Badlands) umbrella is COMPLETE** (all 6 phases 0–5 —
patchwork worldgen through the relic rework; the badlands is a fully populated second biome with a
4-enemy roster, POIs, the Duneshaper win-boss, and the smelting/forging gear + tier-2 relic tiers). The
current arc is the **biome-3 (haunted bayou, working name "Duskmire Bayou") + new-systems roadmap**
(`.claude/plans/biome-3-and-new-systems-roadmap.md`, 5 phases). **Shipped so far:** **Phase 1**
(terrain-that-matters + badlands macro-zones), **Phase 2a** (the activated-ability framework + Dota
QER HUD), **Phase 2b** (the jewelry-effect pipeline + the Gemwright's Table), **Phase 3** (the bayou
gear progression — gem augments + the Gloamsteel/Mirehide reforge tier), **Phase 4a** (the
bayou's terrain, environment and material sources), and now **Phase 4b** (the creature roster —
above). **Phase 4 is sliced into FOUR sessions**
(the Dungeon mechanic was added mid-4a): **4a terrain/env/surface-sources — DONE**; **4b — the
melee-core roster** (Mirejaw / Blighttoad / Mosswretch / Murkling / Fenlurker + the one ranged
Corpselight haunt) — **DONE**, which sourced **Mirehide** and re-enabled the bayou's respawn top-up;
**4c — DUNGEONS (NEXT)** (Valheim burial-chamber/sunken-crypt interiors; where the ability gems + Moonsilver
actually live — ordered after the roster because a dungeon needs creatures to populate it); **4d —
surface POIs + the **Miretyrant** melee boss-with-adds**, which **becomes the new win-con** (locked),
demoting the Duneshaper to a mid-boss and finally making its **Heart** obtainable, unlocking the
Gemwright's ability recipes. **Then Phase 5** (post-big-boss RNG reward choice).
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

### B3-P4c — Biome-3 Phase 4c: Sunken Crypts (the dungeon mechanic) (2026-07-22, Opus)

Plan: `.claude/plans/biome-3-phase-4c-crypts.md`. Phase 4c of the biome-3 roadmap — the **dungeon
mechanic**, and the payoff for 4a's locked surface/dungeon split. In 4a the **most precious
materials were pulled OFF the surface**: `moonsilver` + the three ability geodes
(`gem_gloam`/`gem_ember`/`gem_blood`) were removed from the bayou scatter and their node textures
kept in-repo specifically so this phase could re-site them. Until now those four materials — and
therefore every jewelry recipe and all three Q/E/R abilities from 2a/2b — had **no in-game source
at all** (`__dev.give` only). They do now.

**Locked with the user via `AskUserQuestion` (+ two follow-up corrections):** materials come out as
**mineable nodes deep inside** (re-site the kept geode/seam nodes, not a chest hand-out); **one gem
per crypt, themed**, so *which crypt you clear decides which ability you unlock*; **6 crypts, ~5-7
rooms each** (two per theme); **a unique bespoke mini-boss per gem type** — and, on his correction,
**the materials are hard-gated on beating that encounter** and each warden must feel different
**from each other AND from every previous mini-boss**, i.e. three genuinely different state machines,
not one skeleton with new numbers.

**Interiors are a pocket of the same world, not a second Scene.** Every system the player carries
(run state, HUD, inventory, physics groups, day/night, relics) lives on `MainScene`; a second scene
would duplicate or re-parent all of it. Instead interiors are prebuilt at `create()` in
`CRYPT_REALM` — the dead corner of the world SQUARE that falls outside the world CIRCLE. Physics and
camera bounds already cover it, `drawWorldBoundary()` already paints it near-black, and every spawn
sampler already rejects it. Geometry is measured, not assumed: the rect's nearest corner is **15488
px** from world center vs `WORLD_RADIUS` 14000 (verified live across reseeds). Six interiors sit on
a 3×2 grid inside it, so no two can overlap. Prebuilt (not instanced on demand) means **a
partially-cleared crypt stays cleared for the run**, matching how all world-gen already works.

**New: `src/systems/CryptLayout.ts`** (framework-free, no Phaser) — carves rooms + L-bend corridors
on a 32px cell grid, marks the floor, then turns every non-floor cell touching floor into wall.
Walls come back as **merged horizontal runs**, which is the difference between ~1800 static bodies
across six dungeons and the **601** actually created (measured live). Also picks `entry` (arrival +
exit stairs), `vault` (furthest from entry — the payoff is always a real delve) and `side` (furthest
from both — the loot detour is a detour).

**New: `src/entities/SunkenCrypt.ts`** — the surface doorway + per-crypt state, `BadlandsDen`'s
plain-data-class split (MainScene owns generation/population). `CRYPT_THEMES` is the single source
for a theme's entrance art, map marker, geode texture, gem key, warden name and glow color, so one
decision drives four consistent tells.

**The gate.** Vault geodes + moonsilver seams spawn `shielded: true` — the exact Gloaming Vein
mechanic (`ResourceNode.shielded` + `crack()`), which is why that mechanic exists. Shielded nodes
are skipped by hover/prompt/interact entirely, so there is no walking past the fight to the loot;
the warden's kill handler cracks them into their real textures. **Deliberately NOT done:** sealing
the vault door behind the player. In a hardcore one-life run an arena lock turns "I misjudged this"
into "the run is over with no counterplay" — shielding the reward gates the loot without removing
retreat.

**Three wardens, three different machines** (`src/entities/Palewake.ts` / `Kilnborn.ts` /
`Sanguinarch.ts`). All extend `Enemy`, fully override `update()`, and route area damage through
`checkPlayerHit()` → `applyDamageToPlayer` so dash i-frames and armor just work. That is where the
similarity stops — `Gloamwarden` and `Cinderwrought` both run
`idle → telegraphing → executing → recovering (+poise → staggered)` where **the punish window is
always "chip the poise bar"**, and none of these three do that:
- **Palewake** (gloam → Blink) — *a stalker you cannot always hit.* `stalking` (near-invisible AND
  **untargetable**, the Sandmaw's rule) → `manifest` → `tether` (channels a draining beam that will
  not stop on its own) → `unravel` → `vanish`. **No poise bar.** The only opening is **breaking the
  tether by putting a wall or pillar between you** — a segment-vs-rect test against the crypt's own
  wall list, i.e. a dodge verb that only exists because this phase introduced interiors. Riding the
  channel to its natural end gives you nothing. Its vault seeds extra pillars, and it picks flanks
  with **clear** line-of-sight (a fix caught in verification: without it, it could resolve behind a
  pillar and hand out a free unravel).
- **Kilnborn** (ember → Nova) — *the room is the boss.* Driven by a **heat meter that rises as it
  acts**. Rising heat sets the vault floor alight tile by tile (32px grid, up to 62% of the room —
  the tile size was cut from 48 after a live check showed a vault holding only 12 tiles, making
  "cold ground" five chunky squares); at full heat the **backdraft sweeps exactly the burning
  floor**, so the dodge is not a direction, it's standing on cold ground. The punish window is
  `venting`, and it arrives on the **boss's** clock — you survive to it, you can't force it.
- **Sanguinarch** (blood → Bloodpact) — *you set its phase.* Its flurry stacks bleed (existing
  `pendingBleed`); every ~5s it channels a **feed that resolves against your state at the end** —
  bleeding when it lands and it drinks (heals 45) and swells into `engorged`: slow, huge slams, and
  1.7× incoming damage. Deny it and it just stays a fast, frantic, never-vulnerable frenzy. Bleeding
  is the only way to buy an opening, and it costs you. (`MainScene` pushes `playerBleeding` each
  frame, the same way `envSpeedMult` is pushed — `update()`'s signature can't express player state.)

**Scene wiring.** `activeCrypt` gates the world systems that must not run underground: the player
clamp (crypt footprint instead of the world circle), map reveal (no fog painting of the pocket;
minimap hidden via a new `MinimapUI.setHidden`, biome label shows the crypt's name, world map
refuses to open), the surface respawn tick, the nightfall surge, and the dawn cull. `NightOverlayUI`
gained an `underground` mode — **0.94 alpha of near-black vs night's 0.42** — because at night's
value you could still make out the neighbouring crypt's floor across the void. Interior braziers are
kept **per crypt** (`SunkenCrypt.braziers`) and only lit for the crypt you're in: verification found
**7 neighbouring braziers inside camera range** that would otherwise have hung glowing in the dark
beside you. Crypt dwellers are tracked in a `cryptEnemies` set and **excluded from the surface
respawn budget** (57 of them would have permanently eaten a third of `RESPAWN_MAX_LIVE`), and pinned
to their own crypt each frame (`containCryptEnemies`) — enemies keep the standing
"not blocked by terrain" rule, so doorways aren't a free escape, but a wanderer can never leak into
the void. Entrance positions are picked before any spawning with a `CRYPT_CLEAR_RADIUS` exclusion in
all three samplers (the standing "POI busy = missing exclusion zone" rule). Discovery reuses the POI
quartet with a **per-theme map marker**, so the map itself tells you which ability is buried where.

**Verified live** (`javascript_tool`, each test self-contained): 6 crypts, two per theme, 5-7 rooms,
601 wall bodies of which **zero** overlap a room center; every interior **15488+ px** from world
center (outside the 14000 radius); all 6 doorways in real bayou, min spacing 1745, **0 surface nodes
inside the exclusion** (closest 204px) and 1 cluster-jittered Mosswretch at 190px (the bayou
spawner jitters members after the exclusion check — noted, harmless, arguably a guard); enter →
lands in the entry room, exit → back at the doorway; **shoving into a wall at 400px/s moved 10px,
the same shove in open floor moved 166px**; darkness forced to 1 in-crypt while the sky read 0;
sealed geodes gave **no prompt and could not be mined**, then cracked to the **correct themed gem**
(gloam→`geode_gloam`, ember→`geode_ember`, blood→`geode_blood`) + moonsilver seams, and a cracked
geode mined out in 3 hits to a real drop; chests rolled varied loot; Palewake ticked **10 magic**
with clear LOS and **unravelled 400ms after a wall was interposed** (`isStaggered` 1.6×); Kilnborn
lit 31/50 tiles at full heat and dealt **58 fire + 260 knockback on burning ground vs nothing on
cold ground**, `venting` 1.7×; Sanguinarch **never engorged across 400 ticks while the player wasn't
bleeding** (health flat) but healed 200→280 and engorged (scale 1.85, slam 50 + 220) when they were;
all three classify as `elite` kills; a forced respawn tick + nightfall batch inside a crypt spawned
**0**; a dweller shoved 900px outside its bounds was pinned back inside. `tsc` clean, **zero console
errors**, screenshot captured of a torchlit interior.

Also fixed in passing: `promptFor()` now refuses `shielded`/`harvested` nodes directly. `updateHover`
already filtered them, but the crypt vault's entire material gate rests on that rule, so it's stated
at the prompt layer too rather than living in one loop's filter.

**SAME-SESSION FIX — dungeon collision + pathing (the user: "enemies aren't respecting collision and
aren't pathing through the hallways/rooms... spawning/moving outside of the walls").** Two real bugs
plus the design consequence of fixing the first:
1. **Dwellers walked through walls.** `Enemy.collidesWithTerrain` defaults to FALSE — the standing
   rule, because out in the world solid things are boulders (cover, not structure) and a straight-line
   chaser wedges on them. In a dungeon the wall IS the structure, so crypt dwellers now set the flag,
   which the existing collider's process callback already gates on (no new wiring).
2. **Vault nodes could sit inside the walls.** The geode/seam rings used fixed 96/132px radii, but a
   vault could be 192×160, so the outer ring landed in rock. Radii are now a fraction of the room's
   tightest half-span (plus a clamp), and `CryptLayout` picks the vault from the FAR HALF of rooms by
   **largest area** rather than distance alone (distance alone once handed the boss fight a cupboard).
   Room minimums went 6×5 → 8×7. Measured after: **0 of 36 vault nodes and 0 of 43 live dwellers off
   the floor plan.**
3. **Turning collision on immediately reproduced exactly what the default protects against**: a
   Murkling closed 545px → 276px and then pressed into a wall for 35 straight intervals. Rather than
   revive the per-frame obstacle-avoidance heuristic this codebase deleted once already, crypt
   dwellers now **navigate the structure that already exists** — `CryptLayout` gained a tiny nav
   graph (rooms + corridors as nodes, adjacency = a ≥24px overlap, BFS memoized per layout) and
   `MainScene.steerCryptEnemy` **re-aims the velocity the AI already chose** toward the next doorway.
   Three iterations were needed and each failure is worth recording:
   - **Substituting a fake doorway TARGET doesn't work.** Every enemy with reach thinks it has
     arrived and plants, swinging at air (a Mosswretch's ~100px reach froze it 710px away). Steering
     velocity after `update()` keeps the AI seeing the real player for every range/attack/give-up
     decision.
   - **Pushing the waypoint past the doorway breaks the safety property.** The overlap region is a
     rectangle inside both rects, and rectangles are convex, so a straight line to it never leaves
     the floor; a point 70px beyond it does, and enemies drove into a wall forever.
   - **Re-planning every frame oscillates.** Rooms and corridors overlap, so at a junction an enemy
     is inside three rects at once and "which rect am I in" flips frame to frame (velocity seen
     alternating ±25 while the position held still). Fixed with `rectIndexAt` picking the DEEPEST
     containing rect, a committed per-enemy waypoint (re-planned on arrival or after 1.2s), and a
     look-ahead for the degenerate case where the first seam is the spot you're already standing on.
   Verified: a Murkling pathed **503 → 424 → 325 → 264 → 157 → 20px** through two doorways onto the
   player, and left running, **every** dweller in a crypt (7 Murklings + a Fenlurker) crossed the
   dungeon and ended up within 9–36px of the player while the leashed Kilnborn stayed in its vault at
   501px. Containment now snaps anything off the floor plan to the **nearest** floor point (a net for
   burrows/leaps/knockback, not the thing keeping them in). The Palewake gained an `arena` so its
   flanks are clamped to its vault (20/20 picks on floor) — with collision on, a flank in the rock
   would leave it tethering with no line of sight, handing out a free unravel every cycle.
   **Test-harness note:** the 30s `CHASE_GIVEUP_MS` deaggro silently confounds a long pumped chase
   test — re-arm `forceAggro` each interval or you'll read "stuck" where the enemy simply gave up.

**Not done / next:** **4d — surface POIs + the Miretyrant boss**, which becomes the new win-con
(demoting the Duneshaper to a mid-boss and finally making its Heart, and therefore the ability
jewelry, obtainable). Crypts do not respawn once cleared, and there is no crypt-specific minimap —
both deliberate.

### B3-P4b — Biome-3 Phase 4b: the Duskmire Bayou creature roster (2026-07-22, Opus)

Phase 4b of the biome-3 roadmap (`.claude/plans/biome-3-and-new-systems-roadmap.md`) — the
**melee-core bayou roster**, six bespoke creatures dropped into the terrain 4a built. Scope locked
with the user up front via `AskUserQuestion`: **the specced 6** (not a trimmed 4-5, not a 7th
apex elite); **Mirehide comes from the Mirejaw ONLY** (the signature ambusher — hunting it *is*
the reforge gate, mirroring Bog Ore as the one surface metal); and **build the homing projectile
now** rather than shipping the Corpselight with a straight bolt.

**Two shared hooks first, both tiny, both built before the content that needs them:**
- **`Enemy.pendingPoison`** — the exact contract `pendingBleed` already had (read + cleared by
  `updateEnemies` on the landing frame, so it rides the same i-frame guard);
  `applyDamageToPlayer` gained a matching optional `poison` param that routes to
  `PoisonManager.apply()` — the **discrete, stacking** path, deliberately not the miasma's
  refresh-only `sustain()`.
- **`Projectile.homing`** — optional `{turnRateRadPerSec, target}` (a live ref, re-aimed each
  `preUpdate` by rotating the current velocity toward the target by at most `turnRate·dt`, speed
  preserved), plus an optional `maxLifetimeMs`. The lifetime is **required** for a homing shot:
  the default despawn measures straight-line distance *from spawn*, which a curving orb may never
  exceed — it would orbit forever. Straight shots are untouched and keep the distance rule.

**The six (each a bespoke subclass with its own state machine/constants/loot + elite variant +
per-species trophy, per the standing "own numbers, don't share one config table" rule):**
- **Mirejaw** *(130 HP)* — the signature ambusher and sole **Mirehide** source. Lurks half-sunk at
  **alpha 0.4 — visible**, unlike the Sandmaw's 0.18, so it's spottable — creeps into position,
  then commits a **locked-line lunge chomp** (85 dmg + bleed 7/s×6s). Unlike the Sandmaw it does
  NOT re-submerge after one attempt: it **surfaces and hunts** (62 chomp + bleed), re-lunging from
  mid-range, and only re-buries once it loses you. Also drops **Mirejaw Meat** — the bayou's food
  source, the Duskrunner-meat precedent. Resists pierce ×0.5 / weak slash ×1.25.
- **Blighttoad** *(70 HP)* — the **poison** carrier, the creature half of the biome's signature
  status. Its bite (52) is mostly eaten by bayou-tier plate; the **poison is the payload** —
  armor-bypassing, **stacking per bite**, and it halves every heal source while it runs, so it
  also stops you eating your way out. Semi-swarm (`packAggro` 200), clumps of 2-3, burst **hop**
  locomotion.
- **Mosswretch** *(190 HP)* — the bruiser. **Slowest common enemy in the game** (36px/s, always
  outwalkable) with the **longest common wind-up** (780ms) and a 720ms recovery, so every hit it
  lands is one you chose not to walk out of. **The roster's FIRE lesson:** fire **×1.5**, the
  biggest weakness multiplier on any common enemy, which finally makes the player's fire sources a
  deliberate answer to a specific creature. Resists blunt ×0.5.
- **Murkling** *(22 HP)* — the fast melee swarm and the **AOE-arc payoff enemy**. Dies to one
  bayou-tier hit; the threat is 4-6 at once, faster than the player's walk, with the shortest
  telegraph in the game (150ms). Wide `packAggro` (300) on the **base `state` field** (the
  Duskrunner's zero-override pattern). **Deliberately neutral to every damage type** — it's the
  baseline you measure a weapon's sweep against.
- **Fenlurker** *(85 HP)* — the muck-burrowing ambusher. Shipped alongside the Sandmaw on purpose
  because **the dodge verb is opposite**: the Sandmaw detonates a *ring* (dodge by clearing
  distance), the Fenlurker rakes a **locked line** out of the mud (dodge by stepping aside), and a
  dodged maul leaves it planted a full second with no radial safety net. Invisible **and
  untargetable** while buried (the Sandmaw's locked rule); AoE damage while buried arms a flag that
  `update()` commits next frame (takeHit has no player coords and this attack has a direction to
  lock). Resists slash ×0.5 / weak blunt ×1.25 — **the exact inverse of the Mirejaw**, so the two
  bayou ambushers want different weapons.
- **Corpselight** *(90 HP)* — the **one** ranged creature, kept genuinely uncommon (22 vs 42-139
  for the melee species) so the biome still reads melee-core. Fires the **homing gloam orb**: 110
  px/s, 1.5 rad/s, 4.2s lifetime, `magic` (bypasses flat armor). Neutral to physical on purpose
  (the Hexling's old flat physical resist read as unkillable). Also the bayou's **local Hex Essence
  source**, so forging Gloamsteel no longer means walking back to the badlands.

**Spawning + economy.** `spawnBayouEnemies()` places **358 creatures** through `pickBayouPoint`
(bayou-dominant only, POI exclusions honored), clustered per species rather than evenly spread per
the organic-density preference — and cluster jitter now **re-checks the biome per member** and
falls back to the anchor, an improvement on the badlands pack spawner, which can leak members over
a seam. The bayou's **enemy-respawn top-up is live** (4a had it explicitly gated off), weighted to
its own counts with a real Mirejaw share so the Mirehide tier stays farmable. 3 new materials
(Mirejaw Meat / Blight Gland / Gloam Dust) + 6 elite trophies at **Common / Tier 3** — a new power
tier (×2.25), **roll-only for now**: refining needs a tier-3 shard currency the bayou's own POI /
dungeon phases will source, exactly as biome-2 trophies were before Phase 5 added Ember Shards.
Mosswretch reuses existing keys (Swamp Moss + Wood) and Fenlurker drops **Bones**, giving the bayou
a bone supply that previously only came from forest Boars.

**Verified live** (`javascript_tool`; the backgrounded-preview loop had to be hand-stepped via
`game.loop.step`): 358 bayou creatures, all inside the 6400-10500 band; every stat/resist/loot/
trophy/elite-texture pair read off real instances; **Mirejaw's locked lunge dealt 85 + bleed 7/s
standing still and ZERO damage when sidestepped during the tell**; poison **stacked 6→12→18→24 dps
across repeated bites while the miasma's sustain path held flat at 3** (the two-mode contract);
Mosswretch 800ms telegraph→95 dmg, planted at velocity 0; one woken Murkling **cascaded aggro to
all 5** packmates; Fenlurker buried = untargetable/alpha 0.12/no HP bar, retaliates on AoE damage,
maul 78 + bleed 5; the homing orb **re-aimed 0°→-55° chasing a moving player at exactly its
1.5 rad/s cap** and **expired at 4224ms** (the anti-orbit safeguard), and hit for **20 through 42
flat armor vs 1 for the same shot untyped** — magic bypass + heavy-armor mitigation both correct.
`tsc` clean, zero console errors, all six render with distinct silhouettes (screenshot).
Dashboard Enemies tab (the one hand-mirrored source) + `RECIPES.md`'s trophy table updated; no
recipe changes.

**Same-session tuning pass (the user: orbs "fade away really soon", "remember how powerful the player
is going to be — think about how fast players will be", "the gators are too small").** All three were
the same root error: the roster was sized against the **badlands** roster instead of against a
bayou-ready player. Measured, not guessed — that player **sprints at 166-229 px/s** (Running skill +
move relics, ~309 on a kill-rush), **dashes at 450**, **blinks 220px**, and hits for **45-70 (130-200
on crit)**. Against that, the fastest creature in the roster was 104 px/s and the tankiest was 190 HP:
**the entire biome was outrunnable at a walk and died in two swings.**
- **Corpselight orb:** 110px/s × 4.2s was a **~460px leash** — it died almost as soon as it was fired.
  Now 170px/s × 9s ≈ **1500px of pursuit** (verified: 9024ms/1527px when outrun). The fairness bound
  is unchanged in spirit — 170 is still under a sprint, so running straight escapes outright; verified
  it *does* catch a player moving at 125px/s. Damage 26→34, cast cooldown 2400→1900ms.
- **Speeds** (peak pursuit, measured live): Murkling 104→**172** (the only creature that can hang with
  a sprint — that IS the swarm's identity: you kill it, sweep it, or blink, you don't walk away),
  Mirejaw chase 66→**138** / lunge 400→**560** over 340px, Blighttoad hop burst 150→**300** (~145 avg),
  Fenlurker burrow-stalk 40→**130**, Corpselight drift 40→**85**, Mosswretch 36→**74** (still the
  slowest by design — it's the bruiser, it's *meant* to be escapable).
- **HP** ~2.5-3× (Murkling 22→40, Blighttoad 70→150, Fenlurker 85→220, Corpselight 90→190, Mirejaw
  130→**320**, Mosswretch 190→**420**), and **damage** raised to matter through bayou plate. Measured
  net through a **full Gloamsteel set**: Mosswretch smash **63**, Mirejaw lunge **52**, Fenlurker maul
  **44** — ~4 hits to kill a 220 HP player, all three heavily telegraphed.
- **Mirejaw "stalk patience" (a real bug the tuning exposed):** its stalk is deliberately slow, so a
  player who simply kept walking could never be ambushed — it fell **537px behind and never engaged**.
  After 2.4s of fruitless stalking it now **abandons stealth and hunts**. Verified: walking away → it
  escalates and closes; sprinting away → clean escape (1500px gap). That's the intended contract.
- **Gator size:** sprite redrawn 34×22 → **48×22** and scaled 1.55 (elite 2.0) = **74×34 on screen**,
  the largest common creature in the game, with a `barScale` bump so its HP bar stays readable.

**Next: 4c — dungeons** (where the ability gems + Moonsilver actually live, ordered
after the roster because a dungeon needs creatures), then 4d (surface POIs + the Miretyrant boss +
the win-con swap).
