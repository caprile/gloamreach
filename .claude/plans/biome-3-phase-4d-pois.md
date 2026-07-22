# B3-P4d Session 1 — Bayou surface POIs (Sunken Shrine + Drowned Lodge)

## Context

Phase 4c shipped the Sunken Crypts, so the bayou now has terrain (4a), a creature roster (4b) and
dungeons (4c). What it still has **no** surface destinations: outside the six crypt doorways, the
Duskmire Bayou is open swamp with wild spawns and scattered nodes. The roadmap
(`.claude/plans/biome-3-and-new-systems-roadmap.md:228`) calls the remaining work **4d — surface POIs
+ the Miretyrant boss + the win-con swap**, and the locked surface/dungeon split
(`:230-235`) is explicit that the surface's job is to *feel dangerous and murky while you hunt for a
way in* — which is why surface POIs stayed wanted even after dungeons landed.

**Locked with the user this session:**
- **POIs first, boss next session** (mirrors how badlands Phase 3 was sliced: two POIs, then the boss).
- The two POIs are the **Sunken Shrine** and the **Drowned Lodge**.
- **The Miretyrant must live in its own boss-level DUNGEON, not on the surface** — an amendment to
  the roadmap. Next session builds a bespoke arena interior (4c's `CRYPT_REALM` + `CryptLayout`
  machinery) behind a sealed descent; the altar/totem summon becomes "unseal the descent."
- Summon = **altar + totem whose components come from these POIs**, so this session's job is to
  ship the two POIs *and the boss-key materials they drop*.
- **Shrine = ritual/horde-defense** (the player starts the fight), explicitly breaking the
  "kill the guards, take the loot" verb every existing POI shares.
- **Shrine is re-kindlable; Lodge respawns** on the existing S4 POI timer — nothing in a run
  becomes permanently exhausted.

Out of scope this session: the Miretyrant, its dungeon, the summon recipe/effigy, and the win-con
swap. The boss-key materials ship as inert drops (surfaced by the discovered-material toast) so next
session only has to build the descent + boss, with no dead-end craftable left sitting in the menu.

## Background from exploration

Everything below reuses machinery that already exists — no new frameworks.

- **POI placement + exclusion.** `MainScene.pickBayouPoint` (`:3885`) already samples real bayou
  coverage and honors every POI clear radius; `POI_DEEP_R_MIN` (`:551`) pushes a POI out of
  forest-edge range and `POI_MIN_SEPARATION` (`:554`) keeps POI *types* off each other. The
  standing rule from [[feedback_poi_busy_not_placeholder]] is that a "busy" POI means a missing
  exclusion zone — so each new POI needs its own `*_CLEAR_RADIUS` consulted inside `pickBayouPoint`,
  and positions must be picked in `create()` **before** any content spawning.
- **POI dressing.** `MainScene.decoratePoi` (`:6255`) is the shared floor-decal + marker-ring
  helper every POI uses (`spawnSunkenForges` `:6146` is the cleanest call site).
- **Wave-cleared POI template.** `src/entities/BadlandsDen.ts` is a plain data class holding the
  structure's GameObjects + a `DenPhase` machine, while MainScene owns wave scheduling and smash
  damage. Its `reset()` (`:83`) is the S4 respawn path. This is the shape both new POIs follow.
- **Caches.** `LootContainer` + `MainScene.openChestMenu(loot, table)` (`:3394`) — already
  generalized away from a shack-specific signature, so extra caches cost a hover branch and a
  loot table each.
- **Discovery.** `updatePoiDiscovery` (~`:6790-6870`) is a flat list of one-shot
  `exploredMap.addLandmark(...)` + `eventLog.add("poi", ...)` blocks; new POIs append two more.
- **Night glow.** `collectLights()` reads per-POI light-point arrays (`forgeLightPoints`,
  `cryptLightPoints`); new POIs add their own.
- **Bayou creatures** for the waves/residents already exist: `Mirejaw`, `Blighttoad`, `Mosswretch`,
  `Murkling`, `Fenlurker`, `Corpselight` (`MainScene.ts:21-26`), each taking an `elite` flag.
- **Water depth** is already a real cost: `BAYOU_DEEP_SLOW_MULT` 0.5 / `BAYOU_SHALLOW_SLOW_MULT`
  0.78 (`:534-535`). The Lodge's danger is built on this rather than on new mechanics.

## Design

### 1. The Sunken Shrine — a ritual/defend POI (new verb)

A drowned gloam shrine on a muck island, dormant when found.

- **Kindle:** hover + `[LMB] Make an offering` when carrying the cost (a cheap bayou-native
  offering — 3 `blight_gland` + 2 `gloam_dust`, both already dropped by the 4b roster and
  currently recipe-less). Consumes via `ItemContainer.removeCount()`, the same primitive the
  Gremlin Totem's altar consumption uses.
- **Defend:** kindling starts a ~70s rite in **3 escalating waves**, surfacing around the shrine at
  a fixed radius: (1) a Murkling swarm, (2) Blighttoads + more Murklings, (3) a Mosswretch plus one
  elite. The shrine's brazier burns brighter each wave; the HUD gets nothing new — the light and
  the event log carry it.
- **Leash:** the rite fails if the player leaves `SHRINE_RITE_RADIUS` for more than a few seconds,
  or dies. Failure consumes the offering and returns the shrine to dormant (re-kindlable) — the
  loss is the materials and the time, not the site.
- **Payout:** surviving all three waves opens the shrine's offering bowl as a `LootContainer`
  (reuses `openChestMenu`): guaranteed **1 `tyrant_sigil`** (boss-key component A) plus gloam
  shards / bayou materials.
- **Repeatable:** once the bowl is emptied, the shrine returns to dormant and can be re-kindled
  with a fresh offering. It is a renewable boss-key source by design.

New file `src/entities/SunkenShrine.ts` — a plain data class exactly like `BadlandsDen`
(GameObjects, glow, `ShrinePhase = "dormant" | "rite" | "open"`, `LootContainer`,
`discoveredOnMap`). MainScene owns the wave scheduling, the leash check, and the phase transitions,
mirroring how it owns `BadlandsDen`'s waves.

### 2. The Drowned Lodge — a spatial clear-and-loot POI

A half-submerged stilt village: a wooden walkway with **4-6 small huts** on platforms over deep water.

- **The danger is the geography, not a script.** No wave system: `Corpselight` haunts perch over the
  huts and `Mirejaw`s lurk in the water beneath the walkway. The walkway is narrow, stepping off it
  drops you into the 0.5× deep-water slow, and a Mirejaw ambush there is close to fatal. This
  deliberately makes 4a's water rules and 4b's signature ambusher the content.
- **Spread payoff:** each hut holds its own small `LootContainer`, so you work the site rather than
  opening one chest.
- **Chieftain's hut:** barred until every Corpselight at the site is dead; holds the richest cache
  plus a guaranteed **1 `gorge_bone`** (boss-key component B). Reuses the shielded/gated idiom —
  the hut is skipped by hover/prompt/interact until unbarred, like a shielded `ResourceNode`.
- **Respawns** on the existing S4 POI timer once fully looted, via a `reset()` mirroring
  `BadlandsDen.reset()`.

New file `src/entities/DrownedLodge.ts`, same plain-data-class shape.

### 3. Boss-key materials (feed next session)

Two new `ResourceType`s + `ItemDef`s + `BootScene` icons: **`tyrant_sigil`** (Shrine) and
**`gorge_bone`** (Lodge). No recipe yet — they surface through the existing discovered-material
toast and sit in the backpack until next session's effigy recipe and sealed descent consume them.
Descriptions gesture at "something vast stirs in the deep mire" without naming the boss, per the
standing prompt-gating/no-spoiler rule (the Gremlin Totem's description precedent).

### 4. Placement & counts

`SHRINE_COUNT` 4 and `LODGE_COUNT` 4, spread across the bayou band (`BAYOU_R_MIN` 6400 →
`BAYOU_R_MAX` 10500) at `POI_DEEP_R_MIN`+, each with its own min-spacing and `*_CLEAR_RADIUS`
consulted inside `pickBayouPoint`, positions picked in `create()` before spawning. Each gets a map
landmark (`map_shrine` violet / `map_lodge` weathered-teal), a `"poi"` discovery toast, and night
light points.

## Files

- **New:** `src/entities/SunkenShrine.ts`, `src/entities/DrownedLodge.ts`
- **`src/scenes/MainScene.ts`** — constants block (counts/radii/spacing); `create()` position picks
  + spawn calls; `pickBayouPoint` exclusions; `spawnSunkenShrines`/`spawnDrownedLodges`; the rite
  wave scheduler + leash tick in `update()`; hover/prompt/interact branches
  (`promptForShrine`/`promptForLodgeHut`, mirroring `promptForDen`); loot tables; discovery
  landmarks; light-point arrays; **all new fields reset in `create()`** per the standing
  `scene.restart()` field-initializer rule.
- **`src/systems/Inventory.ts`**, **`src/systems/Items.ts`**, **`src/scenes/BootScene.ts`** — the two
  new materials + structure/prop/map textures (shrine, bowl, lodge hut, walkway, pilings, markers).
- **Docs:** copy this plan to `.claude/plans/biome-3-phase-4d-pois.md` and commit it with the
  feature; add a `### B3-P4d` entry to `STATUS.md` + update `## Current State` in place (prune to
  `STATUS-archive.md` if over budget). No `RECIPES.md`/dashboard change — no recipes or enemy
  stats change this session.

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit`.
2. `preview_start` (config `"dev"`), then `preview_eval` against
   `window.__game.scene.getScene('MainScene')`:
   - **Placement:** 4 shrines + 4 lodges, all inside the bayou band, all pairwise ≥ their min
     spacing and ≥ `POI_MIN_SEPARATION` from other POI types; assert **zero** wild nodes/enemies
     within each clear radius (the "POI busy" regression check).
   - **Shrine cycle:** teleport the player in, `__dev.give` the offering, drive
     kindle → wave 1/2/3 → open; assert the offering is consumed, each wave spawns the right
     species/count, the bowl yields a `tyrant_sigil`, and emptying it returns the phase to
     `dormant` and it re-kindles.
   - **Shrine failure:** kindle, then move the player outside the leash radius; assert it returns
     to dormant and the enemies clean up.
   - **Lodge:** every hut cache opens; the chieftain's hut is un-hoverable (no prompt at all) while
     any Corpselight lives, and yields a `gorge_bone` once they're dead; `reset()` re-arms it.
   - **Discovery:** walking into POI reveal range adds exactly one landmark + one `"poi"` toast per
     site, once.
3. `preview_screenshot` of each POI (day and night, to confirm the glow reads from a distance).
4. `preview_console_logs` level `error` — expect zero.

## Addendum — as shipped (2026-07-22)

Built as planned. Two things worth recording that the plan didn't anticipate:

- **The POI-clearing exclusion was extracted, not extended.** The placement assertion found 2 wood
  nodes inside a Drowned Lodge. The same six-check exclusion list was duplicated in
  `pickBayouPoint`, `pickBadlandsPoint` and `pickOuterForestPoint`, and only the first learned about
  the new POIs (bayou blobs neighbour badlands ones); separately, `scatterInZone` — the macro-zone
  clustered scatter — had no POI check at all, so a large zone's *edge* could drop cypresses into a
  POI. Fixed with one `MainScene.insidePoiClearing(x, y)` consulted by all four paths, replacing the
  three copies. **Any future POI now only needs adding in one place.**
- **A preview gotcha that cost two bad readings:** the player had *died* in an earlier probe, and
  hardcore's `runOver` guard early-returns `update()` — so every polled system (the rite included)
  silently freezes while the scene still reports RUNNING. Check `isDead`/`runOver` before believing
  a "nothing happened" result, and keep each timed sequence inside a single `preview_eval`.

Full verification results in `STATUS.md` under `### B3-P4d(1)`.
