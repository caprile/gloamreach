# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **B3-P4d(1) — Biome-3 Phase 4d,
session 1: the bayou's two surface POIs** (2026-07-22, Opus, plan
`.claude/plans/biome-3-phase-4d-pois.md`). Phase 4d is sliced in two: **this session = the POIs +
the boss-key economy; next session = the Miretyrant + the win-con swap.** Locked amendment
(the user): **the Miretyrant lives in its own boss-level DUNGEON, not on the surface**, so next
session reuses 4c's `CryptLayout`/`CRYPT_REALM` machinery for a bespoke arena and the altar/totem
summon becomes "unseal the descent." The two POIs run on **deliberately different verbs**, because
every prior POI resolves as "kill the guards, take the loot": the **Sunken Shrine** is a rite the
PLAYER starts (spend 3 Blight Gland + 2 Gloam Dust → three escalating waves fought on the spot →
guaranteed **Tyrant Sigil**; walking out of a 420px radius for 5s lapses it, destroying what it
summoned; emptying the bowl re-arms it, so it's renewable with **no** respawn timer), and the
**Drowned Lodge** is a place whose danger is its geography (a stilt village where the boardwalk is
the only safe footing — Corpselights above, Mirejaws in the 0.5×-slow water below; per-hut caches
plus a chieftain's hut planked shut until every haunt is dead, holding a guaranteed **Gorge Bone**;
respawns on the standard S4 timer). Both key materials ship **inert** (no recipe yet — deliberately,
so nothing dead-ends in the crafting menu until the descent exists). Verification caught a real
bug: the POI-clearing exclusion list was duplicated across three samplers so only `pickBayouPoint`
knew about the new POIs, and `scatterInZone` had no check at all — now **one
`insidePoiClearing(x,y)`** consulted by all four paths (0 violations across 2162 nodes / 1043
enemies). Verified live end-to-end; `tsc` clean, zero console errors. **Next: 4d session 2 — the
Miretyrant boss dungeon + the win-con swap.** See B3-P4d(1) below + [[survivor-rpg-biome-3-roadmap]].
Prior: **B3-P4c — Biome-3 Phase 4c: Sunken Crypts, the DUNGEON mechanic** (2026-07-22, Opus, plan
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
See B3-P4c below + [[survivor-rpg-biome-3-roadmap]].
Prior: **B3-P4b — the Duskmire Bayou creature roster** (2026-07-22, Opus). Six bespoke melee-core
creatures (Mirejaw / Blighttoad / Mosswretch / Murkling / Fenlurker) + the one uncommon ranged
Corpselight, which introduced the game's first HOMING projectile. Added `Enemy.pendingPoison`, 3
materials and 6 elite trophies at Common/Tier 3. A same-session tuning pass rescaled the whole
roster — **size new enemies against the PLAYER's measured envelope, never the previous biome's
roster** (see [[feedback_size_enemies_against_player]]). Full entry below.
Prior: **B3-P4a — Duskmire Bayou terrain, environment & material sources** (2026-07-22, Opus). The
bayou as a walkable, harvestable third biome: water slows by depth (never blocks); **`poison` is a
SUBTYPE OF MAGIC** (bypasses flat armor, takes heavy-armor magic mitigation, ticks over time and
halves regen) via a new `Poison.ts` that composes `BleedManager` with stacking `apply()` vs
refresh-only `sustain()` modes; three themed macro-zones (miasma/bonemire/hammock) and 443 nodes;
plus `StatusBarUI`, a generic debuff strip. Full entry in STATUS-archive.md.
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
bayou's terrain, environment and material sources), **Phase 4b** (the creature roster), and now
**Phase 4c** (the Sunken Crypts dungeon mechanic) and **Phase 4d session 1** (the two surface POIs —
above). **Phase 4 is sliced into FOUR sessions** (the Dungeon mechanic was added mid-4a): **4a
terrain/env/surface-sources — DONE**; **4b — the melee-core roster** (Mirejaw / Blighttoad /
Mosswretch / Murkling / Fenlurker + the one ranged Corpselight haunt) — **DONE**, which sourced
**Mirehide** and re-enabled the bayou's respawn top-up; **4c — DUNGEONS — DONE** (6 themed Sunken
Crypts; the 3 ability gems + Moonsilver finally have a source, hard-gated behind a bespoke warden
per gem); **4d — surface POIs + the Miretyrant**, itself split in two: **session 1 (the Sunken
Shrine + Drowned Lodge + the Tyrant Sigil / Gorge Bone key materials) — DONE**; **session 2 —
the Miretyrant melee boss-with-adds (NEXT)**, which per the locked amendment lives in its **own
boss-level dungeon** (a bespoke arena on 4c's `CryptLayout`/`CRYPT_REALM` machinery) behind a sealed
descent unlocked by an effigy crafted from those two materials. It **becomes the new win-con**
(locked), demoting the Duneshaper to a mid-boss and finally making its **Heart** obtainable,
unlocking the Gemwright's ability recipes. **Then Phase 5** (post-big-boss RNG reward choice).
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

### B3-P4d(1) — Biome-3 Phase 4d, session 1: the bayou's surface POIs (2026-07-22, Opus)

Plan: `.claude/plans/biome-3-phase-4d-pois.md`. Phase 4d is **sliced into two sessions** (the user):
this one builds the two surface POIs and the boss-key economy they feed; the next builds the
**Miretyrant** and the win-con swap. **Amendment locked this session: the Miretyrant lives in its
own boss-level DUNGEON, not on the surface** — so next session reuses 4c's `CryptLayout`/
`CRYPT_REALM` interior machinery for a bespoke arena, and the altar/totem summon becomes "unseal
the descent." Both POIs were picked by the user (Sunken Shrine + Drowned Lodge) along with the
summon model (altar + totem whose components drop here).

**The problem this solves.** Outside the six crypt doorways the bayou had no surface destinations —
just wild spawns and scattered nodes. The locked surface/dungeon split says the surface's job is to
*feel dangerous and murky while you hunt for a way in*, which needs places to go.

**Deliberately two different verbs.** Every POI in the game so far — Gremlin Shack, Warren, Sunken
Forge, Gloaming Vein, and now the crypts — resolves as "something guards a thing, kill it, take the
thing." Neither of these does.

- **The Sunken Shrine (`src/entities/SunkenShrine.ts`) — a rite the PLAYER starts.** Dormant when
  found; spending an offering (**3 Blight Gland + 2 Gloam Dust** — both Phase-4b roster drops with
  no other use, so the rite finally gives the bayou's trash mobs an economy) kindles it into a
  three-wave defense fought on the spot: a **Murkling** swarm → **Blighttoads + Murklings** → a
  **Mosswretch pair (one elite) + Blighttoads**. Each wave lands when the last is cleared *or* when
  the interval elapses, so a fast player gets pace instead of waiting. **Leash:** drifting outside
  `SHRINE_RITE_RADIUS` (420) for more than 5s (or going underground) lapses the rite — the offering
  is spent, the site is not, and everything it summoned is destroyed rather than left roaming.
  Surviving opens the bowl (a `LootContainer` through the existing `ChestMenu`) with a **guaranteed
  Tyrant Sigil**. Emptying the bowl returns it to dormant, so it is a **renewable** source, not a
  one-shot clear — no timer needed, which is why shrines are deliberately absent from
  `updatePoiRespawns`. Progress is carried by the fire alone (three textures + a glow that stokes
  per wave); no new HUD.
- **The Drowned Lodge (`src/entities/DrownedLodge.ts`) — a place whose danger is its geography.**
  A half-submerged stilt village: one boardwalk, 4-6 huts on platforms either side, pilings.
  **No script at all** — `Corpselight` haunts drift over the huts and `Mirejaw`s lurk in the water
  beneath the planks, and the planks are the only safe footing (stepping off is 4a's 0.5× deep-water
  slow with the swamp's signature ambusher already there). The payoff is **spread across per-hut
  caches** so you work the site instead of opening one chest; the **last hut is the chieftain's**,
  planked shut until every haunt is dead, holding the richest cache and a **guaranteed Gorge Bone**.
  A barred hut is skipped by hover/prompt/interact entirely — the same reveal-nothing treatment a
  shielded `ResourceNode` gets, so the bar is the only tell. Respawns on the existing S4
  `POI_RESPAWN_MS` timer once every cache is emptied.

**Boss-key materials.** `tyrant_sigil` and `gorge_bone` (new `ResourceType`s/`ItemDef`s/icons,
curio category, bayou tab) ship as **inert drops** surfaced by the discovered-material toast. No
recipe yet — deliberately, so this session doesn't leave a dead-end craftable in the menu; next
session's effigy + sealed descent consume them. Both descriptions gesture at something vast in the
deep mire without naming it (the Gremlin Totem no-spoiler precedent).

**One real bug caught in verification.** The placement assertion found 2 wood nodes inside a
Drowned Lodge (241px and 228px, inside its 280 clear radius). Cause: the POI-clearing exclusion
list was **duplicated in three samplers**, and only `pickBayouPoint` learned about the new POIs —
`pickBadlandsPoint`/`pickOuterForestPoint` didn't (bayou blobs neighbour badlands ones), and
`scatterInZone` had no POI check at all, so a big macro-zone's *edge* could scatter cypresses into
a POI. Fixed by extracting **one `MainScene.insidePoiClearing(x, y)`** consulted by all four paths,
which removes the duplication rather than adding a fourth copy — any future POI now only has to be
added in one place. Re-verified: **0 violations across 2162 nodes and 1043 enemies**, with world
content otherwise unchanged.

**Verified live** (`preview_eval`, one eval per timed sequence): 4 shrines + 4 lodges, all dominant
bayou, radii 6425-10498, min spacing 3273/2884 and cross-type 1387 (≥ `POI_MIN_SEPARATION`); the
full shrine cycle (offering consumed exactly 3/2 → wave 1 = 5 Murklings → wave 2 = 7 → wave 3 =
Mosswretch+Blighttoads → open with `tyrant_sigil`), bowl emptied → dormant → re-kindles, and the
leash lapse cleaning up all 5 summoned enemies and re-kindling after; lodge huts (5 huts, 3
Corpselights, 3 Mirejaws), chief barred → **null prompt** + barred texture → unbars on the last
haunt's death → `gorge_bone`; the full respawn (fully-looted → armed → reset re-bars, re-rolls, and
re-populates); discovery adds exactly one landmark + one `"poi"` toast per site and is idempotent;
all 16 new textures present. Screenshots day + night at both POIs (the lit shrine reads as a teal
fire in the dark; the lodge's wider light hole covers the whole village). `tsc` clean, **zero
console errors**.

**Gotcha worth remembering for future preview runs:** two probes silently produced nonsense because
the player had *died* in an earlier probe — hardcore's `runOver` guard early-returns `update()`, so
every polled system (including the rite) freezes while the scene still looks alive. Check
`isDead`/`runOver` before trusting a "nothing happened" reading, and keep timed sequences inside a
single eval.

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

**SAME-SESSION — room-discovery lighting, blink clipping, and dropping the torch tax (the user:
"discovering a room should light up the whole room, sort of like a fog of war"; "how will the
teleport work in here — should we just not allow it?"; "not a big fan of the requires-torch
mechanic").** All three are the same decision from different angles, so they landed together:
- **A crypt is lit by DISCOVERY, not by equipment.** Setting foot in a room or corridor lights that
  whole space permanently (`SunkenCrypt.discovered`, a per-run set of layout rects), so an explored
  crypt reads as a lit floor plan with the unexplored parts still black — fog of war, not a torch
  radius. `ScreenLight` gained optional `width`/`height` so the existing soft brush can be stretched
  to a room's footprint; each discovered space erases **twice** (a wide halo that softens onto the
  walls, then a core pass at the room's own size), because the halo alone left room edges ~40% dark
  and a "lit" room that reads murky defeats the point.
- **The torch is now a bonus, not a toll.** The player carries `CRYPT_AMBIENT_LIGHT` (120px)
  underground regardless of what's equipped; a torch/lantern widens that pool (180px+) instead of
  being the price of seeing anything. The `crypt_dark` hint was reworded to teach the discovery rule
  rather than sell torches.
- **Gloamstep Blink is CLIPPED, not banned.** Forbidding it was the other option the user raised, but
  the gem that grants it is crypt loot, so a dungeon is the last place it should stop working.
  `clipBlinkToFloor` marches the blink line in 10px steps and lands on the furthest point still on
  floor — stepping rather than testing the endpoint is the whole trick, since a destination can be
  perfectly valid floor on the *far side* of a wall. Verified: all 8 directions from a room center
  land on floor, clipped to 110–160px by the room's own walls, while a surface blink still travels
  its full 220px. `clampPlayerToCrypt` also now snaps the player out of rock as a last resort, for
  any future movement that doesn't ask permission.

**Not done / next:** **4d — surface POIs + the Miretyrant boss**, which becomes the new win-con
(demoting the Duneshaper to a mid-boss and finally making its Heart, and therefore the ability
jewelry, obtainable). Crypts do not respawn once cleared, and there is no crypt-specific minimap —
both deliberate.

