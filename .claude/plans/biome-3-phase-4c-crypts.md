# B3-P4c — Sunken Crypts (the dungeon mechanic)

## Context

Phase 4b shipped the Duskmire Bayou's creature roster, so the surface is dangerous and murky —
but its reward is deliberately only bulk gathering. In 4a the user pulled the **build-defining
materials off the surface**: `moonsilver` and the three ability geodes (`gem_gloam` / `gem_ember` /
`gem_blood`) were removed from the bayou scatter and their `moonsilver_node` / `geode_*` textures
+ `ResourceNode` shapes were **kept in-repo specifically so this phase re-sites them**. Right now
those four materials — and therefore every jewelry recipe and all three Q/E/R abilities from Phase
2a/2b — have **no in-game source at all** (`__dev.give` only).

This phase builds the missing half of the locked surface/dungeon split: **Valheim burial-chamber /
sunken-crypt interiors**, where the precious materials live. Ordered after 4b because a dungeon
needs a roster to populate it.

**Locked this session (the user):**
1. Materials come out as **mineable nodes deep inside** (re-site the kept geode/seam nodes).
2. **One gem per crypt, themed** — which crypt you clear decides which ability you unlock, and
   **the materials are hard-gated on beating that crypt's mini-boss encounter** (see Vault below).
3. **A unique bespoke mini-boss per gem type** — and each must feel different **from each other and
   from every previous mini-boss**: not one skeleton with new numbers, but **three different state
   machines with different win conditions** (see §5).
4. **6 crypts, ~5–7 rooms each** (two per theme).

Scope note: this is the dungeon system *plus* three bespoke bosses. Build order below puts the
system first so the wardens are the tail if the session runs long.

---

## Architecture: interiors are a pocket of the same world

A separate Phaser `Scene` is rejected — every system (run state, HUD, inventory, physics groups,
day/night, relics) lives in `MainScene` and would have to be duplicated or re-parented.

Instead, interiors are prebuilt at `create()` time in the **dead corner of the world square that
sits outside the world circle**. Physics + camera bounds already cover `0..WORLD_SIZE`
(`MainScene.ts:1233-1234`), the corner is already painted near-black by `drawWorldBoundary()`
(depth −8), and every spawn sampler already rejects it. Verified geometry: a rect of
`3400×2400` at `(200,200)` is entirely outside `WORLD_RADIUS` (nearest corner is ~15.4k from
`WORLD_CX/CY`, vs the 14k radius), so no surface content can ever land in it.

- `const CRYPT_REALM = { x: 200, y: 200, w: 3400, h: 2400 }`, split into a **3×2 grid** of
  ~1100×1150 cells — one crypt interior per cell.
- Entering teleports the player in and records `cryptReturn = {x, y}`; leaving teleports back.
  Short `cameras.main.fade`/`fadeIn` on each transition.
- Prebuilt (not instanced on demand) so a partially-cleared crypt **stays** cleared for the run —
  matches how all world-gen already works.

### Systems that need an `activeCrypt` guard (`MainScene`)

| Hook | Behavior inside |
|---|---|
| `clampPlayerToWorld()` (`:4056`) | clamp to the crypt's rect instead of the world circle |
| `updateMapReveal()` (`:1815`) | skip `exploredMap.reveal` (no fog painting of the corner); hide the corner minimap; `updateBiomeUI` shows the crypt's name instead of the biome |
| `updateRespawns()` (`:1981`) + `spawnNightBatch()` (`:1926`) + `cleanupNightSpawns()` (`:1952`) | early-return — surface top-ups must never spawn into a crypt, and dawn must never cull crypt enemies |
| `updateDayNight()` (`:1830`) | clock still ticks; `nightOverlay.render()` is forced to intensity **1.0** — a crypt is always pitch dark, which finally makes the torch/lantern light system load-bearing |
| `environmentEffectAt()` (`:5333`) | return neutral (no water/miasma) |
| `updateRespawns`'s `alive` filter | exclude crypt enemies via a `cryptEnemies: Set<Enemy>` so ~60 dungeon enemies don't eat the `RESPAWN_MAX_LIVE = 160` budget |

---

## Build order

### 1. Layout generation — `src/systems/CryptLayout.ts` (new, framework-free)

`generateCrypt(rng, rect, roomCount) → { rooms: Rect[], corridors: Rect[], entry: Room, vault: Room, walls: Rect[] }`.
Randomized branching walk on a 32px cell grid: carve `roomCount` (5–7) rooms + connecting
corridors, mark floor cells, then any non-floor cell adjacent to floor becomes wall. **Merge
horizontal wall runs into single rects** before returning — that collapses ~300 blocks/crypt into
~40 segments, keeping static-body and draw counts sane. `entry` = first room, `vault` = the room
furthest (path distance) from entry. Deterministic from `sessionRng()`, like all world-gen.

### 2. Interior construction — `MainScene.buildCrypt()`

- Floor: one `poi_floor_crypt` image per room/corridor rect at depth −7 (over the void ring).
- Walls: one `TileSprite` per merged run added to the existing **`solids`** static group (the
  group `spawnNodes` already uses, `:1254`) so player *and* enemies collide — same mechanism as
  `fillBoulderfield` (`:5214`). Y-sorted via `ysortDepth`.
- Dressing: pillars, rubble, and **braziers** whose positions push into `cryptLightPoints`,
  consumed by `collectLights()` (`:1851`) exactly like `campLightPoints`.
- Exit stairs in the entry room (a hover-interactable, `[LMB] Leave the crypt`).

### 3. Surface entrances + discovery

`CryptEntrance` (new small entity, modeled on `BadlandsDen.ts` — a plain data class; MainScene owns
the logic). 6 positions picked in `create()` **before** any spawning, via `pickBayouPoint`, with a
new `CRYPT_CLEAR_RADIUS` exclusion added to `pickBayouPoint`/`pickBadlandsPoint`/`pickSpawnPoint`
alongside the existing `DEN_CLEAR_RADIUS`/`FORGE_CLEAR_RADIUS` checks (`:3711-3740`) — the standing
"POI busy = missing exclusion zone" rule. Per-theme lintel color so you can read gloam/ember/blood
from outside. `decoratePoi()` dressing, `cryptLightPoints` night glow, `map_crypt` landmark via
`exploredMap.addLandmark` in `updateAltarDiscovery()` (`:6108`), and a `"poi"` discovery toast —
the same quartet the Sunken Forge and Warren already use.

### 4. Contents (reuse, no new systems)

- **Trash rooms:** staged bayou creatures (Murkling packs / Blighttoad / Fenlurker / Mosswretch),
  `rollElite` per spawn, pushed to `enemies` + `enemyGroup` + `cryptEnemies`.
- **Side room chest:** `LootContainer` + `openChestMenu(loot, CRYPT_LOOT_TABLE)` verbatim
  (`:3225`) — mirehide/bog ore/gloam shards/trophies/1–2 `moonsilver`.
- **Vault (hard-gated on the kill):** the themed warden + a ring of geode nodes and moonsilver
  seams, all spawned **`shielded: true`** — `ResourceNode` already skips shielded nodes for
  hover/prompt/interact entirely, so they can't be mined, prompted, or even seen as interactable
  until the warden dies and its kill handler calls `crack(texture)` on each. Exactly the Gloaming
  Vein mechanic (`armVein()` `:5869`), which is why that mechanic exists. No walking past the
  encounter to the loot.
  *Deliberately NOT doing:* sealing the vault door behind the player. In a hardcore one-life run
  (`HARDCORE`, M-R1) a no-escape arena lock turns "I misjudged this fight" into "the run is over
  with no counterplay" — shielding the reward gates the loot without removing retreat.

### 5. Three bespoke wardens (`src/entities/`) — three *different machines*

All three extend `Enemy` and fully override `update()` (Snake/Gloamwarden precedent), and all route
area damage through `checkPlayerHit()` → `applyDamageToPlayer` so dash i-frames and armor just work.
That is where the similarity stops. Per the user: they must not read as re-skins of each other or of
`Gloamwarden`/`Cinderwrought`, both of which run the same
`idle → telegraphing → executing → recovering (+ poise → staggered)` skeleton where **the punish
window is always "chip the poise bar"**. So each warden gets its **own loop and its own opening
condition** — the poise/stagger bar is used by *at most one* of them:

- **Palewake** (gloam → Blink) — *a stalker you cannot always hit.*
  `stalking (near-invisible, circling) → manifest (flanks you) → tether (channels a draining gloam
  beam) → unravel (vulnerable) → vanish`.
  **No poise bar.** It's untargetable while stalking, and the only way to open it is to **break the
  tether by putting a wall or pillar between you** — the crypt keeps an explicit wall-rect list, so
  this is a cheap segment-vs-rect test. A dodge verb that only exists because we now have interiors.
  The fight is a positioning puzzle, not a damage race.

- **Kilnborn** (ember → Nova) — *the room is the boss.*
  `stoking → emberlash (quick fire jabs) → overheat charge → BACKDRAFT (room-wide) → venting`.
  Driven by a **heat meter that rises as it acts**, not a poise meter that falls as you hit it.
  Rising heat progressively **sets floor tiles alight** (`fire` type, already an
  `IncomingDamageType`), shrinking your safe ground; at max heat the backdraft is survivable only
  from the tiles that are still cold. The punish window is **`venting`** — long, self-inflicted,
  arrives on the *boss's* clock. You fight the arena and wait for the vent.

- **Sanguinarch** (blood → Bloodpact) — *you set its phase, not the boss.*
  `frenzy (fast, cheap hits that stack bleed via the existing pendingBleed contract) ⇄ feed
  (channels; heals ONLY if you are currently bleeding) → engorged (slow, huge slams, takes bonus
  damage)`.
  Its transitions are **driven by the player's own bleed stacks**: let it feed and it engorges into
  a slow, heavy, damage-vulnerable phase; deny it (dodge the flurry, or burn the bleed off) and it
  stays a fast frantic frenzy that never opens up. This is the one that keeps a stagger-style punish,
  and even that is earned by *managing your own debuff*, not by chip damage.

Wire each into the five existing mini-boss touch points, following `Gloamwarden`/`Cinderwrought`:
respawn exclusion (`:1986`), the `checkPlayerHit` union (`:6642`), `staggerMultiplierFor` (`:7022`),
the kill tail (`:7468`), and `classifyKill` → `"elite"` (`:7686`). They stay on the small floating
bar (`engagedBigBoss()` is for big bosses only, per Phase 5's locked distinction).

### 6. Art + bookkeeping

`BootScene.ts`: `crypt_wall`, `poi_floor_crypt`, `crypt_stairs`, `crypt_pillar`, `crypt_brazier`,
3× `crypt_entrance_*`, `map_crypt`, and the 3 warden sprites (upright, drawn facing **right**, per
the standing creature-art convention). Reset every new per-run field (`crypts`, `activeCrypt`,
`cryptReturn`, `cryptEnemies`, `cryptLightPoints`) at the top of `create()` — the `scene.restart()`
field-init gotcha. Update the dashboard **Enemies tab** (manual mirror) with the three wardens.
No `RECIPES.md` change (no new recipes — this gives existing recipes their first real source).

---

## Verification (live, not just `tsc`)

1. `node node_modules/typescript/bin/tsc --noEmit`.
2. `preview_start` config `"dev"`; `preview_resize` if the render loop is stuck.
3. `preview_eval` against `window.__game.scene.getScene('MainScene')`:
   - **Placement:** all 6 entrances land in real bayou, ≥ spacing apart, and no surface node/enemy
     lands within `CRYPT_CLEAR_RADIUS` of one (measure, don't eyeball — the war-camp lesson).
   - **Realm isolation:** every generated crypt rect is fully outside `WORLD_RADIUS`; force a
     nightfall + a respawn tick while inside and assert **zero** new enemies spawn in the realm.
   - **Transition:** enter → player is in the entry room, `clampPlayerToWorld` holds them inside the
     crypt rect (walk at a wall, read position); exit → back at the surface entrance.
   - **Walls collide** (drive the player into one, assert no penetration) and **darkness** is full
     regardless of `dayNight.nightIntensity01()`, with the torch light hole present.
   - **Vault gate:** geodes read `shielded`, reject mining AND produce no hover prompt; kill the
     warden → they crack and mine out `gem_*` / `moonsilver`; each themed crypt yields **only** its
     own gem.
   - **Each warden, tested against its own loop** (not one shared assertion):
     Palewake — untargetable while `stalking`, tether ticks damage with line-of-sight, and
     interposing a wall rect forces `unravel`; Kilnborn — heat rises with actions, floor tiles ignite
     as it climbs, backdraft spares cold tiles, and `venting` is the only vulnerable window;
     Sanguinarch — `feed` heals it **only** while the player has bleed stacks, and denying bleed
     keeps it out of `engorged`. Plus, for all three: `classifyKill === "elite"` and each attack
     lands standing still / misses when dodged.
4. `preview_console_logs` level `error` (expect zero).
5. Screenshot a lit crypt interior for the ship note.

Then: `STATUS.md` (`Current State` rewritten in place + a `### B3-P4c` entry, prune if >40KB),
copy this plan to `.claude/plans/` and commit to `main` alongside the feature.
