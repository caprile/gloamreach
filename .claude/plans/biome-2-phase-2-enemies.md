# Biome 2 — Phase 2: Badlands enemies & wildlife (core 3 + flora)

> Phase 2 of the `biome-2-sunscorch-badlands.md` umbrella. Built on **Opus** (new content /
> AI). Scope locked with the user via `AskUserQuestion`: **the core 3 enemies + arid flora**
> this session; the umbrella's "+1 native creature" is deferred to a short Phase 2b. Difficulty
> = **noticeably tougher** than the forest roster (~1.5–2× HP/damage, denser packs). Rock
> reptile resist profile = **resist slash, neutral blunt, weak pierce**.

## What this delivers

The first *content* in the badlands — three bespoke enemies that each exercise one of Phase 1's
dormant hooks, plus two arid harvestables. All spawn out in the badlands patchwork (never the
forest disc), via a new badlands-coverage sampler. No POIs/boss/forging yet (Phases 3–5).

Each enemy follows the established per-enemy precedent: own subclass, own state machine +
constants + loot (NOT a shared config table), reusing the `Enemy` base's souls-like telegraph
mechanism (`tickMeleeSwing`/`playWindupTell`/`faceAngle`/`reachBonus`), the elite pattern
(`elite?` → +50% HP/dmg, ×1.1 speed, ×1.3–1.4 scale, 2× loot, crimson/gold recolor, central
trophy drop), and `rollElite` chance-based spawning.

### 1. Duskrunner (gloam-touched canid swarm) — the pack-aggro payoff
- **Lore:** a gaunt, gloam-touched jackal that hunts the dry flats in packs; its eyes catch an
  ember glint. (`Items` description on its pelt/trophy carries the flavor.)
- **AI:** fast chase, short-telegraph bite. Drives the **base `state` field** (idle/chasing),
  NOT a private `mode`, so the base `forceAggro()` works with **zero override** — this is the
  intended reference for a `packAggro` user. Sets `this.packAggro = true`,
  `packAggroRadius = 260`. Own tuned constants (fast ~92 chase, short 220ms windup bite).
- **Numbers (first-pass):** HP 20, bite 14, chase 92, aggro 150 / deaggro 260. Elite ×1.5.
- **Resist:** none (neutral) — it's the AOE-arc payoff enemy; a resist would muddle cleave feel.
- **Loot:** `duskrunner_pelt` ×1 (×2 elite) — a future leather-tier hide (no recipe yet).
  Elite also drops `duskrunner_trophy` (central `eliteTrophy`).
- **Spawn:** in packs (3–4 clustered at a site) so `updatePackAggro` visibly converges them.

### 2. Cragscale (armored rock reptile) — teaches the damage-type layer
- **Lore:** a slab-scaled basking reptile; its stone-hard plates turn aside blades but crack
  under a well-placed thrust.
- **AI:** own `update()` override (slow bruiser). Slow approach, one heavy telegraphed
  **basher** (long windup, big hit, knockback) via `tickMeleeSwing` with its own `SwingConfig`.
  Tanky. Faces its wind-up with `faceAngle` (like Boar/Snake tells).
- **Numbers:** HP 60 (tanky = "noticeably tougher"), bite 22, chase 40, aggro 130 / deaggro 240,
  windup ~520ms / recover ~600ms, knockback ~180. Elite ×1.5.
- **Resist (locked):** `{ slash: 0.5, blunt: 1.0, pierce: 1.6 }` — leaving `ranged`/`magic`
  neutral. Slash bounces, pierce (Primal Spear) shreds; the damage number recolors via the
  existing `resolveWeaponHit` effectiveness tint.
- **Loot:** `cragscale_plate` ×1–2 (future heavy-armor/smithing ingredient). Elite +
  `cragscale_trophy`.

### 3. Hexling (magical gremlin variant) — first magic damage to the player
- **Lore:** a hex-warped gremlin humming with unstable gloam-fire; its bolts eat through armor.
- **AI:** compact **stand-and-cast kiter** — a deliberately simpler kite than RangedGremlin
  (maintain distance, plant briefly, cast a single **magic bolt**; back off when crowded).
  Its own subclass of `Enemy` (NOT extending RangedGremlin — avoids coupling to its
  burst/hold-band complexity), tracks a private `mode`, so it **overrides `isAggro()`**
  (RangedGremlin precedent). Telegraphed melee claw is out of scope — it purely kites+casts;
  if cornered it just keeps trying to back off + cast.
- **Magic bolt:** reuses `Projectile` with a new `damageType: "magic"` (see below) → **bypasses
  the player's flat armor** in `applyDamageToPlayer` (the dormant Phase 1 hook goes live here).
  New `hex_bolt` violet texture. Bolt damage kept modest (14) since it ignores armor.
- **Numbers:** HP 30, bolt 14 magic, cast cooldown ~2000ms, projectile 200px/s, range 240,
  kite band ~150–240. Elite ×1.5.
- **Resist:** `{ magic: 0.4, slash: 1.4, blunt: 1.4, pierce: 1.4 }` — "resists magic, weak to
  physical" (all three melee types). `ranged` left neutral.
- **Loot:** `hex_essence` ×1 (future magic-weapon/alchemy reagent). Elite + `hexling_trophy`.

### Arid flora (2 harvestables) — reuse the persistent free-pickup + regrow pattern
Both mirror Blackberry exactly (`ResourceNode` `persistent`/`pickedTexture`/`regrowMs`,
action `pickup`, `loose:false`, tool-free `[LMB] Pick up`). No recipes wired — they're future
alchemy/food ingredients, surfaced only via the discovered-material toast.
- **Emberbloom** (desert herb) → `emberbloom`. Regrow ~3 in-game min (reuse blackberry const or
  a sibling). Seed of a future alchemy loop.
- **Sunfruit Cactus** → `sunfruit` (cactus fruit). Regrow similarly. Future food ingredient.

## Systems touched

- **`src/entities/Duskrunner.ts`, `Cragscale.ts`, `Hexling.ts`** (new) — the three subclasses.
- **`src/entities/Projectile.ts`** — add optional `damageType?: DamageType` to
  `ProjectileConfig` + a readonly `damageType` on `Projectile` (default `undefined` =
  physical). Gremlin rock stays undefined (unchanged); Hexling bolt = `"magic"`.
- **`src/scenes/MainScene.ts`**
  - Enemy-projectile→player overlap (create(), ~L806): pass `projectile.damageType` as the 3rd
    arg to `applyDamageToPlayer` (magic bolts bypass armor). Physical rocks unchanged.
  - `pickBadlandsPoint(rng, clearRadius, minCoverage=0.5)` — sample the world box within the
    badlands radius band, require `worldBiomes.coverageAt(x,y,"badlands") ≥ minCoverage`, inside
    the world circle, and outside the War-Camp/Vein exclusion zones (same rejections
    `pickSpawnPoint` uses). Higher attempt cap (blobs are sparse); graceful fallback.
  - `spawnBadlandsEnemies()` — Duskrunner packs (clustered) + scattered Cragscale + Hexling,
    each `elite: this.rollElite(rng)`. First-pass counts. Called in `create()` after the POIs.
  - `spawnBadlandsFlora()` — scatter Emberbloom + Sunfruit via `pickBadlandsPoint`, built as
    `ResourceNode`s and pushed into the same arrays Blackberry uses (so hover/interact/regrow
    all work with no new interact code). Called near `spawnNodes`.
  - Imports for the 3 new entity classes.
- **`src/systems/Inventory.ts`** — add `duskrunner_pelt`, `cragscale_plate`, `hex_essence`,
  `emberbloom`, `sunfruit`, `duskrunner_trophy`, `cragscale_trophy`, `hexling_trophy` to
  `ResourceType`.
- **`src/systems/Items.ts`** — `ItemDef` entries (name, description w/ Gloamreach flavor) for all
  8 new resources. Trophies get the same treatment as `boar_trophy`/`snake_trophy`.
- **`src/systems/Relics.ts`** — `TROPHY_ROLL` entries for the 3 badlands trophies, mapped to
  **Common / tier 1** for now (same as 5n's per-species approach). **Phase 5** remaps them to
  tier-2 + Ember refinement — flagged in-code. Keeps the elite→trophy→relic loop working today.
- **`src/scenes/BootScene.ts`** — textures: `duskrunner`/`_elite`, `cragscale`/`_elite`,
  `hexling`/`_elite`, `hex_bolt` (violet orb), `emberbloom`/`_picked`, `sunfruit`/`_picked`, and
  `icon_*` for the 8 new resources — all via the existing `Graphics.generateTexture` pattern.

## Deliberately NOT in scope

- The umbrella's 4th bespoke native creature (deferred to Phase 2b).
- Any recipe/alchemy/food use of the new materials (Phase 4+ / future alchemy).
- Tier-2 trophy/relic economy + Ember Shards (Phase 5) — badlands trophies are Common/tier1 now.
- Badlands POIs / boss (Phase 3), forging/gear (Phase 4).
- Fixing the enemy-respawn top-up so it spawns badlands species out in the badlands (it still
  tops up forest species near the player regardless of biome — pre-existing, harmless, noted as
  a Phase 2b/M-W1 follow-up).

## Verification (per CLAUDE.md loop)

1. `node node_modules/typescript/bin/tsc --noEmit` — clean.
2. `preview_start` ("dev") → `preview_resize` (un-throttle) → `preview_screenshot` boots.
3. `preview_eval` against `MainScene`:
   - Teleport into a badlands blob; confirm Duskrunners/Cragscale/Hexling are present and a
     harvestable Emberbloom/Sunfruit exists.
   - Aggro one Duskrunner; confirm `updatePackAggro` wakes packmates (pack converges).
   - Hit a Cragscale with slash vs pierce; assert applied damage reflects 0.5 / 1.6 and the
     damage-number tint (`resist`/`weak`).
   - Take a Hexling bolt in armor; confirm it bypasses flat armor (magic path); confirm a
     physical Gremlin rock still subtracts armor.
   - Confirm no badlands enemy/flora spawned inside the forest disc, and forest content is
     unchanged.
4. `preview_console_logs` (level error) clean.

## Conventions to honor

- New Y-sort world objects use `ysortDepth` (Enemy base + ResourceNode already do — no raw `y`).
- Update **`STATUS.md`** (Current State + a Recent Entry), the **dashboard Enemies tab**
  (`dashboard.html` — the one manual mirror; add the 3 badlands enemies + elites), and
  **`CLAUDE.md`**'s roadmap/biome-2 status. No `RECIPES.md` change (no new recipes).
- Commit this plan file into `.claude/plans/` alongside the feature.
