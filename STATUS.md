# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **B3-P4d(2) — Biome-3 Phase 4d,
session 2: the Miretyrant, its lair, and the win-con swap** (2026-07-22, Opus, plan
`.claude/plans/biome-3-phase-4d-miretyrant.md`). **This completes Phase 4d and moves the game's
win-condition to the bayou**, demoting the Duneshaper to a mid-boss exactly as biome 2 demoted the
Gremlin King — which finally makes the **Duneshaper's Heart** obtainable (it gates the Gemwright's
ability-jewelry tier and had been unreachable since B3-P2b, because killing it ended the run).
Session 1's inert `tyrant_sigil`/`gorge_bone` now craft the **Effigy of the Miretyrant** (2/1/4
with Mirehide, tier 1), which reveals the **Sunken Gorge** on the map and unseals its maw. Locked
via `AskUserQuestion` (all as recommended): adds = **bellow waves** on their own clock (3 per
bellow, 5 enraged, capped at 8 — punctuation, not crowd-control busywork); interior = **approach +
arena**; **no arena seal** (4c's lock — hardcore + no escape = no counterplay); **one fixed lair**.
The boss is a deliberate counterweight to the caster Duneshaper: a **bruiser** that closes to ~96px,
whose dodges are all spacing dodges (locked-heading chomp, ±120° tail sweep you escape by distance,
radial slam, and a phase-2 death roll you outrun across), resisting slash and poison but folding to
**blunt** so the two finales reward different loadouts. The dungeon layer was **generalized, not
copied**: `generateCrypt` gained an optional forced arena room, a new `DungeonInterior` interface
(`src/systems/Dungeon.ts`) lets the player clamp, room lighting, nav steering, containment and every
underground gate serve both interiors with no branching, and the shell builder was extracted into
`renderDungeonShell()`. Verified live end-to-end (placement, key loop, descent, every attack's hit
geometry, phase gates, bellow cap, both win/no-win kills); `tsc` clean, zero console errors.
**Next: Phase 5 — the post-big-boss RNG reward choice**, whose trigger (a big-boss kill that does
NOT end the run) now exists for both the Gremlin King and the Duneshaper. See B3-P4d(2) below +
[[survivor-rpg-biome-3-roadmap]].
Prior: **B3-P4d(1) — Biome-3 Phase 4d, session 1: the bayou's two surface POIs** (2026-07-22, Opus,
plan `.claude/plans/biome-3-phase-4d-pois.md`). The two POIs run on **deliberately different
verbs**, because every prior POI resolves as "kill the guards, take the loot": the **Sunken Shrine**
is a rite the
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
enemies). Verified live end-to-end; `tsc` clean, zero console errors. See B3-P4d(1) below +
[[survivor-rpg-biome-3-roadmap]].
Prior: **B3-P4c — Biome-3 Phase 4c: Sunken Crypts, the DUNGEON mechanic** (2026-07-22, Opus, plan
`.claude/plans/biome-3-phase-4c-crypts.md`). 6 crypts (two per gem theme) whose interiors are a
**pocket of the same world**, not a second Scene — prebuilt in `CRYPT_REALM`, the dead corner of the
world SQUARE outside the world CIRCLE, laid out by the framework-free `src/systems/CryptLayout.ts`
(merged wall runs, room-discovery lighting, crypt nav for dwellers that now collide with walls).
The 3 ability gems + Moonsilver live here, hard-gated `shielded` behind **three bespoke wardens with
three genuinely different state machines** (Palewake's breakable drain-tether / Kilnborn's rising
heat meter and cold-tile dodge / Sanguinarch's player-driven phase). Full entry in
STATUS-archive.md; see [[survivor-rpg-biome-3-roadmap]].
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
is obtainable, unlocking the Gemwright's ability recipes). **NEXT: Phase 5** — the post-big-boss RNG
reward choice, the last phase of this arc; its trigger (a big-boss kill that does NOT end the run)
now exists for both the Gremlin King and the Duneshaper.
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

### B3-P4d(2) — Biome-3 Phase 4d, session 2: the Miretyrant, its lair, and the win-con swap (2026-07-22, Opus)

Plan: `.claude/plans/biome-3-phase-4d-miretyrant.md`. The second half of Phase 4d, and the payoff
for session 1: `tyrant_sigil` and `gorge_bone` shipped inert, and this is what consumes them.
**The bayou boss is now the game's win-condition**, demoting the Duneshaper to a mid-boss exactly
as biome 2 demoted the Gremlin King.

**Locked this session (`AskUserQuestion`, all four as recommended):** adds = **bellow waves**
(periodic clearable batches — punctuation, not a crowd-control job; rejected a continuous Broodmaw
trickle and mandatory phase-locked packs); interior = **approach + arena** (rejected a bare single
chamber, which makes the descent a loading screen, and a full 5-7 room crypt, which would read as a
7th crypt); **no arena seal** (4c's lock — hardcore + no escape = no counterplay; retreat resets it);
**one fixed lair**, revealed on the map when the effigy is crafted.

**The key.** New `miretyrant_effigy` recipe (misc, tier 1 — Workbench proximity, deliberately **no**
workbench-TIER gate, since its real gate is the POI materials): `2 Tyrant Sigil + 1 Gorge Bone +
4 Mirehide` = two survived shrine rites, one cleared Drowned Lodge, and gator hide to bind it.
Crafting it fires `onMiretyrantEffigyCrafted()` — a direct mirror of `onTyrantTotemCrafted()` —
which drops the `map_gorge` landmark and a directional nudge, because a single door in a 28000px
world is not findable by exploration.

**The descent.** One **Sunken Gorge**, position picked in `create()` before any spawning with its
own `GORGE_CLEAR_RADIUS` (300) added to the single `insidePoiClearing()` session 1 consolidated —
so the new POI needed adding in exactly one place, which is what that extraction was for. Sealed it
prompts `[LMB] Break the seal` (prompted even while sealed, the tyrant-altar precedent, so the site
reads as real content before you can use it); clicking without the effigy logs why nothing happened.
Offering it swaps the maw texture, shakes the camera, and the site becomes a crypt doorway.

**Generalizing the dungeon, not copying it.** Two small changes rather than a parallel system:
`CryptLayout.generateCrypt` gained an optional **arena cell size** — that room is placed first,
becomes the layout's `vault`, and `entry` becomes the room furthest from it (rooms reordered so
index 0 is still the entry), because a 2.6x boss plus adds plus dodging room does not fit in a
random 8-12 cell room. And a new `src/systems/Dungeon.ts` **`DungeonInterior`** interface captures
exactly what MainScene's underground paths already wanted (name / x / y / layout / entryPoint /
braziers / discovered / exitStairs / enemies): `activeCrypt` became `activeDungeon: DungeonInterior`,
`SunkenCrypt` gained a `name` getter, and the player clamp, room-discovery lighting, brazier lights,
crypt-nav steering, containment net, exit-stairs hover and every "don't run surface systems down
here" gate now serve both with **no branching**. The floor/wall/prop/stairs builder was likewise
**extracted, not duplicated**, into `renderDungeonShell()` — all of it was about being underground,
none of it about being a crypt. The lair's interior lives in a new `LAIR_REALM` rect in the same
dead corner outside the world circle, below `CRYPT_REALM` and non-overlapping (measured: nearest
corner 14751px from world center vs `WORLD_RADIUS` 14000).

**The Miretyrant** (`src/entities/Miretyrant.ts`) — bespoke telegraph/poise AI on the GremlinKing /
Gloamwarden / Duneshaper lineage, a trimmed sibling and **not** a shared framework (the standing boss
lock). HP 3200, poise 450 (stagger x1.35 / 2.2s), scale 2.6, regen 16 HP/s deaggro'd, leash 620.
Where the Duneshaper is a caster that holds 220px and throws magic, this is a **bruiser** that closes
to ~96px and stays there, so every dodge is a spacing dodge: **Lunging Chomp** (locked heading, step
off the line), **Tail Sweep** (165px / ±120° — dodge by distance or dash, a sidestep never clears
it), **Muck Slam** (radial, growing telegraph), and a phase-2 **Death Roll** (a travelling multi-hit
spin you outrun across, never along — the only attack that can hit you twice). Resistances
`{ slash: 0.8, blunt: 1.2, poison: 0.25 }`: a thick swamp hide that folds to a warhammer, deliberately
**not** the Duneshaper's fire-weakness so the two finales reward different loadouts. Phases: Death
Roll at 65% HP, enrage timing + halved bellow interval at 35%, multipliers captured at state entry.
**The bellow runs on its own clock**, not in the attack pool, so it lands as punctuation between
attacks; the boss only ASKS (`consumeBellow()`) and MainScene resolves the spawn — the same contract
`checkPlayerHit()` uses, which is what gets the adds terrain collision, crypt navigation and
containment for free. Adds surface at the arena's edge (never on the player), 3 per bellow / 5 enraged,
hard-capped at 8 concurrent.

**Win-con swap.** A `Miretyrant` kill fires `endRun("won")`; the `Duneshaper` branch is gone. It
joins `classifyKill` as `"boss"`, `engagedBigBoss()` (the top-of-screen bar), `staggerMultiplierFor`,
the `checkPlayerHit` boss union, the boss prompt color, and both `isBoss` exclusions (respawn +
`__dev.killall`). The Duneshaper's **Heart** — which gates the Gemwright's Table's ability-jewelry
tier and had been unreachable since B3-P2b because killing it ended the run — is finally obtainable,
along with its Tier-2 boss trophy. `__dev.spawn("miretyrant")` added.

**Verified live** (`preview_eval`; the Browser pane is hidden in this session so the render loop was
driven with `game.loop.step` and **screenshots were not possible** — everything below is state
assertion, not a visual check):
- **Placement:** gorge at r=8241 (bayou band 6400-10500), ≥1215px from every other POI type, **0**
  wild nodes and **0** wild enemies inside its 300px clearing.
- **Interior:** 4 rooms / 6 corridors / 133 merged wall runs; arena 832×576 and the largest room;
  entry is `rooms[0]`, is not the arena, and sits 1298px from it; every room inside `LAIR_REALM`;
  8 inhabitants, and the **only** thing in the arena is the boss.
- **Key loop:** recipe discovered once the materials are known + a bench exists; crafting consumed
  exactly 2/1/4 and produced 1 effigy, set `lairRevealed`, added the `map_gorge` landmark and logged
  the directional nudge. Clicking the sealed maw with no effigy: no state change, logged "The seal
  holds." Offering it: texture → `gorge_maw_open`, prompt → "Descend into the Sunken Gorge".
  Descend put the player exactly on `entryPoint` with the label reading "The Sunken Gorge"; the exit
  stairs prompted and returned them 60px from the maw.
- **Boss:** aggro'd at range, registered on the big boss bar, cycled
  idle → telegraph → execute → recover through all three base attacks. `checkPlayerHit` geometry
  asserted case by case: chomp 60px hit / 90px miss; sweep front hit, **behind and 200px both miss**;
  slam 140px hit / 170px miss and **once per attack**; roll hits, is blocked for its 420ms interval,
  then hits again, and misses at 120px; nothing at all outside `executing`.
- **Phases:** at full HP the pool never offered the roll; at 60% it did. At 30% the boss was enraged
  and the bellow added 5 at once, stopping exactly at the cap of 8. Every add was terrain-colliding
  and in `cryptEnemies`, all 12 live lair enemies were on floor, and nothing else was in the realm.
- **Win-con:** a Duneshaper kill scored as a boss, left `runOver` false, and yielded its Heart; a
  Miretyrant kill classified `"boss"` and ended the run with outcome `"won"` and the victory screen.
- `tsc --noEmit` clean; **zero console errors**.

**A verification gotcha worth recording** (it cost a bad reading, and the session-1 addendum warned
about the same class of thing): `__dev.god()` is a **toggle**. Calling it twice re-armed death, the
planted test player died, and hardcore's `runOver` guard silently froze `update()` — so a boss that
was cycling fine read as "stuck in telegraph for 53 seconds". Any "nothing is happening" result
underground should be checked against `isDead`/`runOver` before it is believed.

**Next: Phase 5** — the post-big-boss RNG reward choice. With the win-con moved, the Gremlin King and
the Duneshaper are both non-run-ending big-boss kills, which is exactly the trigger Phase 5 wants.

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

