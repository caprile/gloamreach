# Biome 2 — Phase 3: POIs (Duskrunner Warren + Sunken Forge) + boss rework

> Phase 3 of the `biome-2-sunscorch-badlands.md` umbrella. The umbrella bundles the badlands
> boss + Gremlin King critical-drop rework + 2 unique POIs into one "Phase 3." That's 2–3
> sessions of work, so it's being built in slices. **the user scoped this session to "two POIs
> first"** (AskUserQuestion) — the boss + King rework stay deferred.

## Scope + build order for Phase 3

1. **POI 1 — Duskrunner Warren** (SHIPPED). Two-wave destructible den → cache.
2. **POI 2 — the Sunken Forge** (SHIPPED). A bespoke fire/forge mini-boss guarding a themed landmark.
3. **Badlands boss** (NEXT, its own session). New win-condition final boss; demotes the Gremlin
   King. Bespoke AI à la `GremlinKing.ts`/`Gloamwarden.ts` (telegraph/poise, NOT a shared
   framework). Update the M-R1 win/score classifier so killing THIS boss fires `endRun("won")`.
4. **Gremlin King critical-drop rework** (later, interlocks with Phase 4 gear). Retire
   `gremlin_king_fang`'s trophy-only role; the King must drop a **load-bearing biome-2 material**
   that gates/greatly boosts the new gear tier.

Phase 4 (smelting/forging) doesn't exist yet, so POI 2's smelting *theme* ships as loot + a
mini-boss fight only, with a clear Phase-4 hook — no smelting wiring this pass.

---

## POI 1 — Duskrunner Warren (SHIPPED 2026-07-12, Opus)

the user's locked spec (a two-wave **destructible** den, deliberately NOT a Gremlin-Shack clone):

- **Two waves, no respawn.** wave1 = 3 normal Duskrunners guard the den; clearing them spawns
  wave2 = 3 **elite** Duskrunners. The den does NOT respawn — you destroy it.
- **Loot gated behind destruction.** The den is inert during the fight. Once both waves fall it
  becomes **attackable with a MELEE weapon** (it has its own HP; ranged doesn't apply to a
  structure). Smashing it collapses it into a **lootable cache** (a heap of the fallen). So "loot
  only after both waves" is automatic (the cache only exists post-destruction).
- **Fairly common.** Dens are ~one per sizable badlands chunk (NOT a rare landmark) — 10 dens,
  spread apart.
- **Duskrunners are a food source.** Every Duskrunner (den + wild) drops raw meat. The cook/eat
  specifics are deferred ("just noting it" — the user) — the food exists in the world, undesigned.

### As built

- **`src/entities/BadlandsDen.ts`** — plain data class (not a GameObject subclass; MainScene owns
  the wave/smash scheduling, mirroring the shack). A burrow-mound `image` + a lazily-created cache
  `image` + `LootContainer`. `DenPhase` = `wave1 | wave2 | attackable | looted`:
  - `takeHit(dmg)` (only while `attackable`) applies HP damage + shake/darken feedback; on the
    killing hit `collapse()` swaps to `duskrunner_den_wrecked`, spawns a `warren_cache` sprite +
    warm pulsing glow.
  - `get target()` = the cache once looted, else the mound (the current hover/interact target).
  - `syncGlow()` keeps the cache glow honest (glow only while it holds loot).
  - `DEN_HEALTH` 42.
- **`MainScene`:**
  - `spawnBadlandsDens()` — **10 dens** (`DEN_COUNT`) spread ≥`DEN_MIN_SPACING` (950px) apart via
    `pickBadlandsPoint`, picked **before** the wild badlands packs so a new `DEN_CLEAR_RADIUS`
    (200) exclusion in `pickBadlandsPoint` keeps ordinary spawns out of a den's clearing (the
    "POI busy = missing exclusion zone" lesson).
  - `spawnDenWave(den, elite)` — 3 Duskrunners clustered on the den, tracked as `den.guards`.
  - `onDenGuardKilled(enemy)` — called from `resolveWeaponHit`'s kill branch (beside
    `onShackGuardKilled`). On a fully-cleared wave: wave1 → spawn the elite wave2; wave2 → the den
    becomes `attackable`. Event-log lines announce each.
  - `tryAttackDen(den)` — melee-weapon smash, mirrors `tryMeleeAttack`'s cooldown/stamina/reach
    guards + a size-scaled `denReach` (mirrors `enemyReach`). On collapse, rolls
    `DUSKRUNNER_WARREN_LOOT_TABLE` + reveals the cache.
  - Hover/prompt/interact: new `hoveredDen`, `promptForDen` (nothing during waves; "Smash the
    warren" only with a melee weapon; "Search the remains" when looted; out-of-reach = nothing),
    a `tryInteract` branch, and the hover-highlight target = `den.target`. The den is interactable
    only while `attackable`/`looted` so the mound doesn't block enemy hovers during the fight.
  - Cache opens via `openChestMenu(loot, table)` — **generalized** from `(shack)` so both the shack
    and the den reuse the shared `ChestMenu`.
  - **Discovery:** `updateAltarDiscovery` adds a `map_den` minimap/world landmark ("Duskrunner
    Warren", dusty orange-brown `0xc06a34`) **and** fires a prominent **discovery popup toast** —
    a new `"poi"` `LogKind` (`EventLog`/`EventLogUI`), routed through `showToast` like a
    biome-discovery toast, warm orange to match the marker.
  - **Night:** `denLightPoints` in `collectLights` (radius 90 — subtler than a full POI).
- **Loot** (`DUSKRUNNER_WARREN_LOOT_TABLE`): guaranteed pelts, likely meat/bones, chances at
  `sandmaw_chitin`/`gloam_shard` + a `duskrunner_trophy` — richer than a shack (a two-wave elite
  fight earns it).
- **Food source:** `duskrunner_meat` — new `ResourceType`/`ItemDef`/`icon_duskrunner_meat`; added
  to `Duskrunner`'s loot (elite 2×). Cook/eat deferred (a "future ingredient" like sunfruit).
- **Textures** (`BootScene`): `duskrunner_den` / `duskrunner_den_wrecked` / `warren_cache` /
  `map_den` / `icon_duskrunner_meat`.
- No `RECIPES.md` change (cache is a loot table; meat has no recipe yet). Dashboard Enemies-tab
  Duskrunner loot row updated (the one hand-mirrored source).

**Verified live** (`preview_eval` + screenshots): 10 dens spread across r 2505–5004 (minGap
1214px); full wave1(normal)→wave2(elite)→attackable→wrecked+cache→loot cycle; prompt gating; the
meat drop; the discovery popup toast + `map_den` landmark render. `tsc` clean, no console errors.

---

## POI 2 — the Sunken Forge (SHIPPED 2026-07-12, Opus)

the user's locked decisions (AskUserQuestion): **loot = Uncommon relic trophy + Gloam Shards**
(mirror the Gloamwarden); **attacks = Cinder Cone + Forge Hammer**; **names = The Sunken Forge /
Cinderwrought**.

A bespoke fire/forge **mini-boss** guarding a themed landmark, modeled on `Gloamwarden.ts`'s
telegraph/poise/stagger skeleton (a trimmed sibling, NOT a shared framework), with two
**new-feeling** attacks distinct from Gloamwarden (leap-smash / point-eruption) and GremlinKing
(charge / radial-slam):
- **Cinder Cone** — rears back, then exhales a fire cone in a **LOCKED direction** (the angle
  snaps to the player at telegraph START, so sidestepping the 820ms wind-up clears the ±32°/210px
  fan). The game's **only** cone attack — the Cinderwrought's signature.
- **Forge Hammer** — a heavy overhead front-arc smash (±70°/155px, re-locks direction at execute)
  punishing close standing; the dodge is to back out of the wide-but-short wedge (or dash).

### As built

- **`src/entities/Cinderwrought.ts`** — extends `Enemy` for the HP-bar/loot/death machinery, fully
  overrides `update()` (Snake/Boar/Gloamwarden precedent). `idle → telegraphing → executing →
  recovering → staggered` state machine + a poise meter (70, `takeHit` chips 1:1 → stagger ×1.5 for
  2.5s) drawn as a second amber bar below the HP bar. HP 300 (badlands-tough, above the forest
  Gloamwarden's 260), scale 1.8, regens 12 HP/s deaggro'd, leash 520. `resistances: { blunt: 0.8,
  pierce: 1.25 }` (a molten-slag crust — the Phase-1 damage-type nudge, inverse of a Sandmaw). Both
  attacks funnel through `checkPlayerHit()` (wedge geometry: dist + angular diff vs the locked
  `attackAngle`) → `applyDamageToPlayer`, so dash i-frames/armor just work. Cone 30 dmg/140 kb,
  hammer 44 dmg/240 kb. Fire-colored `Graphics` telegraph + execute visuals (fan/wedge), no
  world-space red arcs on the sprite itself beyond the fill.
- **`MainScene`** — `forgePosition` picked once in `create()` (after the vein, kept ≥1000px from the
  camp / ≥900px from the vein via `pickForgePosition` over `pickBadlandsPoint`), before spawning so
  a new `FORGE_CLEAR_RADIUS` (220) exclusion in `pickBadlandsPoint` keeps ordinary badlands content
  out of the clearing (the standing exclusion-zone lesson). `spawnSunkenForge()` drops the
  `sunken_forge` structure + the Cinderwrought + `FORGE_DECOR_COUNT` (9) scattered `slag_chunk`
  props; `forgeLightPoints` glow ember at night (`collectLights`, radius 130). Discovery adds a
  `map_forge` minimap/world landmark ("The Sunken Forge", fiery `0xd6481a`) + fires the `"poi"`
  discovery toast (`updateAltarDiscovery`). Wired into the `checkPlayerHit` boss `instanceof` union,
  `staggerMultiplierFor`, `classifyKill` (elite), the boss prompt-color union, and the respawn
  `isBoss` exclusion. Scored as an **elite** kill (no dedicated mini-boss band, like the Gloamwarden).
- **`BootScene`** — `cinderwrought` (34×42 charred-iron brute with molten cracks + forge-hammer
  fists + ember eyes), `sunken_forge` (48×38 ruined smithy w/ molten crucible + anvil), `slag_chunk`
  (16×14 cooled-lava rubble), `map_forge` marker (fiery orange-red).
- **No smelting wiring** — Phase 4 doesn't exist, so the forge's smithy theme ships as loot + the
  mini-boss fight only, per the plan's Phase-4 hook. **No post-kill interactable** (unlike the vein's
  mineable nodes) — the loot IS the Cinderwrought's guaranteed drop. No `RECIPES.md` change.

**Verified live** (`preview_eval` + screenshot): forge spawns at r≈4174 (accessible badlands),
3377px from camp / 3167px from vein; all 4 textures load; boss HP 300/poise 70/scale 1.8; aggro +
poise-bar-on-aggro; full `idle→telegraph→execute→recover→idle` cycle for BOTH attacks; cone hits in
the fan / misses at 90° sidestep / misses beyond 210px; hammer hits front / misses behind / misses
beyond 155px; resists blunt 0.8 / pierce 1.25 / slash 1.0; poise→0 staggers (×1.5); the fight kills a
full-HP player (damage path end-to-end); discovery adds the `map_forge` landmark + fires the `"poi"`
toast; `tsc --noEmit` clean, no console errors. Dashboard Enemies tab updated (the one manual mirror).

Deferred to their own later sessions: the **badlands final boss** (new win-con) and the **Gremlin
King critical-drop rework** (interlocks with Phase 4 gear).
