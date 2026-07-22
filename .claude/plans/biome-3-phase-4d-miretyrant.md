# B3-P4d Session 2 — The Miretyrant (bayou final boss, its lair, and the win-con swap)

## Context

Session 1 shipped the bayou's two surface POIs and the two boss-key materials they drop
(`tyrant_sigil` from a Sunken Shrine's survived rite, `gorge_bone` from a Drowned Lodge's
chieftain hut). Both ship **inert** — no recipe consumes them yet. This session builds what they
unlock.

**Locked amendment from session 1 (the user):** the Miretyrant does **not** fight on the surface.
It lives in its own **boss-level dungeon**, reusing Phase 4c's `CRYPT_REALM` + `CryptLayout`
machinery, behind a sealed descent that an effigy unseals. The altar/totem summon of biomes 1-2
becomes "unseal the descent."

**Locked this session (AskUserQuestion):**
1. **Adds = bellow waves.** Periodic, clearable batches — punctuation, not a crowd-control job.
   Rejected: a continuous Broodmaw trickle, and phase-locked mandatory packs.
2. **Interior = approach + arena.** A short 3-room descent with bayou dwellers, then one large
   bespoke arena chamber. Rejected: a bare single chamber (the descent would be a loading screen)
   and a full 5-7 room crypt (it would read as a 7th crypt, not a final-boss lair).
3. **No arena seal.** Consistent with 4c's locked decision — hardcore + no escape = no counterplay.
   Retreat up the stairs and the boss resets/regens like every other boss.
4. **One fixed lair,** auto-revealed on the map when the effigy is crafted (the Duneshaper altar
   clue-system precedent). One destination, not a hunt across a 28000px world.

## Design

### 1. The key: Effigy of the Miretyrant

New craftable `miretyrant_effigy` (misc, tier 1 — Workbench proximity, no workbench-TIER gate;
its real gate is the two POI materials): `{ tyrant_sigil: 2, gorge_bone: 1, mirehide: 4 }`. Two
survived rites, one cleared Lodge, and gator hide to bind it. Consumed at the sealed maw.

Crafting it **reveals the lair on the map** — `onMiretyrantEffigyCrafted()`, a direct mirror of
`onTyrantTotemCrafted()` (landmark + a directional nudge if it's far). Per the standing no-spoiler
rule the description gestures at what's below without naming the boss.

### 2. The Sunken Gorge — the descent

One fixed site, position picked in `create()` **before** any content spawning, deep bayou
(`POI_DEEP_R_MIN`+, min-separated from other POI types), with its own `GORGE_CLEAR_RADIUS` added
to the single `insidePoiClearing()` (the one place session 1 consolidated all POI exclusions).
`decoratePoi` dressing + night light points, like every other POI.

Two states, both a plain hover/reach prompt:
- **Sealed** → `[LMB] Break the seal`. Clicking without an effigy logs why nothing happened (the
  Duneshaper altar's precedent — the site reads as real content before you can use it). With one:
  consume (hotbar first, backpack fallback), a short beat, texture swaps to the open maw.
- **Open** → `[LMB] Descend into the Sunken Gorge`, i.e. exactly a crypt doorway.

### 3. The interior — generalizing the dungeon, not copying it

The lair is a second **dungeon interior**, not a second crypt. Two small generalizations rather
than a parallel system:

- **`CryptLayout.generateCrypt` gains an optional `arena` cell size.** When given, one oversized
  room is placed first and becomes the layout's `vault`; `entry` is then the room furthest from
  it, and `rooms[0]` is reordered to keep the documented "index 0 is always entry" invariant.
  Walls/corridors are derived from the floor mask either way, so nothing else changes.
- **A `DungeonInterior` interface** (name / layout / entryPoint / braziers / discovered /
  exitStairs / enemies) captures exactly what MainScene's underground paths already use.
  `SunkenCrypt` gains a `name` getter (returns `def.name`) and satisfies it; the new
  `src/entities/MiretyrantLair.ts` satisfies it too. `activeCrypt` becomes
  `activeDungeon: DungeonInterior | null`, so the player clamp, the fog-of-war room lighting, the
  brazier lights, the crypt-nav steering, the containment net, the surface-system gates and the
  exit-stairs hover all serve both with no branching.

The lair's interior lives in a new `LAIR_REALM` rect in the same dead corner outside the world
circle, **below** `CRYPT_REALM` and non-overlapping (nearest corner to world center measured at
~14750px vs `WORLD_RADIUS` 14000). Approach rooms hold bayou dwellers; the arena holds only the
boss. No chest and no vault nodes — the run ends on the kill, so loot past the win is moot.

### 4. The Miretyrant

`src/entities/Miretyrant.ts` — bespoke telegraph/poise AI on the GremlinKing / Duneshaper /
Gloamwarden lineage (a trimmed sibling, **not** a shared framework — the standing boss lock).
Extends `Enemy`, fully overrides `update()`. A melee bruiser, unlike the caster Duneshaper: it
wants to be on top of you, and its dodges are spacing dodges.

- HP 3200, poise 450 (stagger ×1.35 / 2.2s), scale 2.6, deaggro regen 16 HP/s.
- **Resistances `{ slash: 0.8, blunt: 1.2, poison: 0.25 }`** — a thick swamp hide that shrugs off
  cuts and its own element, and folds to a warhammer. Deliberately *not* the Duneshaper's
  fire-weakness, so the two finales reward different loadouts.
- **Attacks (melee, all via `checkPlayerHit`)**: **Lunging Chomp** (a locked-heading gap-closer
  ending in a jaw snap), **Tail Sweep** (a wide rear-to-front arc, big knockback — dodge by
  distance, not by sidestep), **Muck Slam** (radial AoE under itself with a growing telegraph),
  plus a phase-2 **Death Roll** (a travelling multi-hit spin along a locked line — the one attack
  you outrun rather than step around).
- **Bellow (the adds mechanic)** runs on its **own timer**, not the attack pool, so it reads as
  punctuation: while aggro'd and between attacks it rears and bellows, and MainScene surfaces a
  small batch of Murklings/Blighttoads in the arena. Capped concurrent adds so a slow fight can't
  drown the player; interval shortens and the batch grows per phase. The boss exposes
  `consumeBellow()` and the scene does the spawning — the same "boss asks, scene resolves"
  contract `checkPlayerHit()` already uses, so adds get terrain collision, crypt-nav steering and
  containment for free.
- **Phases**: ≤65% HP unlocks the death roll; ≤35% enrages telegraph/recovery timing and halves
  the bellow interval. Multipliers captured at state entry (the standing rule, so crossing a
  threshold mid-telegraph can't retroactively shrink a playing animation).

### 5. The win-con swap

- A `Miretyrant` kill fires `endRun("won")`; the `Duneshaper` branch is removed. It joins
  `classifyKill` as `"boss"`, `engagedBigBoss()` (the top-of-screen boss bar), `staggerMultiplierFor`,
  the `checkPlayerHit` boss union, and the respawn `isBoss` exclusion.
- The **Duneshaper becomes a mid-boss**: its guaranteed **Heart** (which gates the Gemwright's
  Table's ability-jewelry tier) and its Tier-2 boss trophy are finally obtainable, closing the
  dead end B3-P2b shipped with. Its comments are updated to stop calling it the win boss.

## Files

- **New:** `src/entities/Miretyrant.ts`, `src/entities/MiretyrantLair.ts`.
- **`src/systems/CryptLayout.ts`** — optional arena room + the `DungeonInterior` shape.
- **`src/entities/SunkenCrypt.ts`** — `name` getter.
- **`src/scenes/MainScene.ts`** — constants; the gorge position pick + `insidePoiClearing`;
  `spawnSunkenGorge` + `buildLairInterior`; unseal/descend prompts + interact branches;
  `activeCrypt` → `activeDungeon`; the bellow-add spawner; discovery landmark + effigy reveal;
  win-con swap; **every new field reset in `create()`** per the `scene.restart()` rule.
- **`src/systems/Recipes.ts`**, **`Items.ts`**, **`Inventory.ts`**, **`BootScene.ts`** — the effigy
  recipe/item/icon, the boss + maw + map-marker textures.
- **Docs:** this plan committed in-repo; `RECIPES.md` (one new recipe); the dashboard's Enemies tab
  (the one manual mirror); `STATUS.md` entry + `Current State` rewrite.

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit`.
2. `preview_start` (`"dev"`) + `preview_eval`:
   - **Placement:** one gorge, in the bayou band, ≥ `POI_MIN_SEPARATION` from other POI types,
     zero wild nodes/enemies inside its clear radius.
   - **Key loop:** effigy recipe gated on the two POI materials; crafting reveals the lair
     landmark; clicking the maw without one is a no-op with a log line; with one it consumes and
     opens.
   - **Interior:** descend/exit; the arena is the layout's vault and is genuinely oversized; walls
     are solid; approach rooms populated; nothing spawns in the arena but the boss; containment +
     crypt-nav apply to adds.
   - **Boss:** stats/resists; each attack's telegraph→execute→recover cycle and its
     `checkPlayerHit` geometry (hit and miss); phase gates open the death roll and the enrage;
     bellow spawns adds on its timer, respects the cap, and the adds are terrain-colliding.
   - **Win-con:** a Miretyrant kill fires `endRun("won")` (VICTORY screen); a Duneshaper kill does
     **not**, and drops its Heart.
3. `preview_screenshot` of the maw (day + night) and the arena.
4. `preview_console_logs` level `error` — expect zero.
