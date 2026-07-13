# Biome 2 — Phase 3: The Duneshaper (badlands final boss + win-con swap)

> Phase 3 of the `biome-2-sunscorch-badlands.md` umbrella. The two POIs (Duskrunner Warren,
> Sunken Forge) shipped in `biome-2-phase-3-pois.md`. This slice is the **badlands final
> boss** — the new win-condition, demoting the Gremlin King. The **Gremlin King critical-drop
> rework stays deferred** to Phase 4 (it must gate the not-yet-built forged gear tier).

## Locked decisions (the user, this session — via AskUserQuestion + follow-up)

1. **Scope:** build the boss + swap the win-condition to it NOW. Its drop = a tier-2 relic
   trophy path (self-contained). The King's critical-drop rework is deferred to Phase 4.
2. **Summon:** the boss has its **own Boss Altar(s)** in the badlands, but the summon item is
   **gathered from a POI** — specifically the **Duskrunner Warren caches** (dens). No
   free-standing summon; you must clear Warrens.
3. **Identity:** **The Duneshaper** (a.k.a. the Gloam Tyrant) — a gloam-warped apex sorcerer
   commanding sand + gloamfire. Sand-spike zoning, magic bolt volleys, teleport-blink, a
   fire lance, and a meteor barrage. The most technical fight in the game.
4. **Difficulty:** phase-gated attack escalation — **3 attacks** at full HP, **+1 attack at
   70% HP**, **+1 more at 50% HP**, and enrage timing below 50%. Out-classes the Gremlin King
   (3 attacks + one enrage phase).
5. **Multiple altars + a clue system** (the user's follow-up): a single altar could sit on the
   far side of the huge world. So spawn **several** badlands Tyrant Altars, and give the
   player a **clue system** to find one: (a) night-glow beacons, (b) auto-discovered minimap/
   world-map landmarks when explored near, and — the load-bearing fix — (c) **crafting the
   summon totem reveals ALL Tyrant Altars on the world map** + a directional nudge to the
   nearest, so "the altar is across the map" is never a dead end.

## Design

### The Duneshaper — `src/entities/Duneshaper.ts`

Bespoke AI following the `GremlinKing.ts` / `Gloamwarden.ts` telegraph/poise pattern (NOT a
shared framework — the standing "own condition/numbers, don't generalize" boss lock). Extends
`Enemy` for the HP-bar/loot/death machinery; fully overrides `update()` (Snake/Boar/
Gloamwarden/Cinderwrought precedent). State machine `idle → telegraphing → executing →
recovering → staggered`, a poise meter (stagger → ×1.5 punish window), deaggro HP regen.

- HP **900** (final boss — above the Gremlin King's 600), scale **2.3**, poise **120**,
  stagger ×1.5 for 3s, aggro 300, leash 560, move 48, deaggro-regen 14/s. All first-pass.
- **Damage-type mix** so armor partially matters: physical attacks (sand spikes) take the
  flat-armor subtraction; magic attacks (bolts/nova/lance/barrage) carry `dmgType: "magic"`
  and **bypass flat armor** (the Phase-1 hook). It also declares `resistances` (weak to
  physical melee, resists magic — a caster's hide) so player weapon choice reads.
- **Phase-gated attack pool** (the escalation): `attackPool` grows as HP drops. `pickAttack`
  draws from the currently-unlocked set (never the same twice in a row).
  - **Phase 1 (100%→):** `gloam_volley`, `sand_spikes`, `blink_nova`.
  - **Phase 2 (≤70% HP):** unlock `gloamfire_lance`.
  - **Phase 3 (≤50% HP):** unlock `sunscorch_barrage` **and** enrage timing (shorter
    telegraph/recovery + faster approach, captured per-state-entry like the King).
- **Attacks:**
  - `gloam_volley` — rear-back telegraph, then spawns **3 magic `gloam_bolt` projectiles** in
    a ±18° spread (reuses `spawnProjectile`; the existing enemy-projectile→player overlap
    forwards `dmgType: "magic"`). No `checkPlayerHit` (projectiles self-resolve). Ranged
    pressure.
  - `sand_spikes` — locks **3 growing spike circles** across the player's spot (on-player +
    perpendicular spread, à la Hexling flame but **physical `pierce`**), detonate together.
    `checkPlayerHit` radial over the circles. The armor-matters attack.
  - `blink_nova` — telegraph charge, then **blinks** to a spot near the player (reuses the
    Hexling blink ghost visual) and detonates a **radial magic nova** around itself.
    `checkPlayerHit` radial (magic + knockback). The gap-closer.
  - `gloamfire_lance` (P2) — a **locked-direction beam**: direction snaps to the player at
    telegraph start, then a long thin gloamfire wedge fires (magic). `checkPlayerHit` wedge
    (dist + angular diff vs locked angle). Sidestep the wind-up to dodge.
  - `sunscorch_barrage` (P3) — the apex: **7 meteor impact circles** carpeted in a ring
    around the player + one on them, all telegraph then detonate together (magic).
    `checkPlayerHit` over the circles (find a gap). First-pass as a simultaneous carpet
    (simpler/safer than staggered rain); may be reworked to staggered later.
- `checkPlayerHit()` returns `{ damage, knockback?, dmgType? }` (same richer contract the
  other area bosses use). `isEngaged()` + `poiseMax` getter for the big boss HUD.

### Summon: altars + gathered totem

- **`warren_fetish`** (new `ResourceType`, "Gloam-Bone Fetish") — added to
  `DUSKRUNNER_WARREN_LOOT_TABLE` (guaranteed 1/cache). Description hints it "hums toward the
  old altars." The gather source (clear Warrens → collect fetishes).
- **`tyrant_totem`** (new crafted item, "Effigy of the Duneshaper") — recipe tier 1
  (Workbench-gated), `{ warren_fetish: 3, gloam_shard: 2, bones: 8 }`, discovered once a
  fetish is known. A `maxStack` consumable like `gremlin_totem` (NOT a placeable) — consumed
  at the altar via `removeCount`.
- **`BossAltar.kind`**: `"gremlin" | "tyrant"`. The existing forest War-Camp altar is
  `"gremlin"` (unchanged). Add **3 Tyrant Altars** in the badlands (`pickBadlandsPoint`,
  spread apart), pushed into the same `bossAltars` array so hover / night-light / discovery
  reuse; prompt/summon/discovery branch on `kind`.
- `attemptSummonBoss` branches: tyrant → consume `tyrant_totem`, guard a scene
  `tyrantSummoned` flag (one boss/run), `spawnDuneshaper` at that altar. `promptForAltar`
  tyrant → "[LMB] Offer the Effigy" (in reach + not yet summoned).

### Clue system (findability)

- **Night glow:** Tyrant Altars are `bossAltars`, already lit by `collectLights` — a beacon
  in the dark (their violet flame shows through the erased hole).
- **Discovery landmarks:** `updateAltarDiscovery` generalized to give tyrant altars a distinct
  **violet `map_tyrant_altar`** marker + "Duneshaper's Altar" label when explored near.
- **Reveal-on-craft (the fix):** crafting `tyrant_totem` calls `onTyrantTotemCrafted()` →
  adds **every** Tyrant Altar landmark to the map immediately + an event-log directional line
  ("The effigy tugs toward the north-east…") toward the nearest. So once you commit to the
  boss you can always see where to go.
- A soft hint (`discoverMaterial`/event-log) on first `warren_fetish` pickup points at the
  effigy loop.

### Win-condition swap

- Kill path: **Duneshaper kill → `endRun("won")`** (after the 1.2s beat). **Remove** the
  GremlinKing → win trigger; the King becomes a mid-boss (still `classifyKill` "boss" = 500
  pts, still drops `gremlin_king_fang` — its critical-drop rework is Phase 4).
- `classifyKill` Duneshaper → "boss"; add to the `checkPlayerHit` boss union,
  `staggerMultiplierFor`, the boss prompt-color union, and the respawn `isBoss` exclusion.
- **BossHealthUI** generalized from `GremlinKing`-typed to a small `BossBarTarget` interface
  (`displayName/health/maxHealth/poise/poiseMax/depleted/isEngaged()`); the scene passes
  whichever big boss is engaged (`gremlinKing ?? duneshaper`). Mini-bosses (Gloamwarden/
  Cinderwrought) stay off the big HUD (floating bars only), as today.

### Files

New: `src/entities/Duneshaper.ts`, plan file. Edit: `BossAltar.ts` (kind), `Inventory.ts`
(+warren_fetish), `Items.ts` (+2 defs), `Recipes.ts` (+tyrant_totem), `BootScene.ts` (6
textures), `BossHealthUI.ts` (interface), `MainScene.ts` (bulk: fields/reset, positions,
spawn, exclusion, altar branching, spawnDuneshaper, win/HUD/hooks, craft clue, warren loot),
`GremlinKing.ts` (`poiseMax` getter), `dashboard/main.ts` (Enemies mirror), `RECIPES.md`,
`STATUS.md`, `CLAUDE.md`.

### Verification

`tsc --noEmit`; `preview_start` + `preview_eval`: summon at an altar consumes the totem →
Duneshaper spawns; step the state machine through all 5 attacks; drop HP below 70%/50% and
confirm the pool unlocks + enrage; a Duneshaper kill fires `endRun("won")` (King kill does
NOT); crafting the totem reveals altars on the map. Screenshot the fight.

### Deferred

Gremlin King critical-drop rework (Phase 4 gear gate); tier-2 relic retiering of the badlands
trophies (Phase 5). The Duneshaper drops a Common relic-trophy path for now (via its guaranteed
loot) — kept simple until Phase 5 re-tiers the whole badlands trophy set.
