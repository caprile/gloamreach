# Biome 2 — Phase 0: Patchwork worldgen foundation

> Detail plan for **Phase 0** of `biome-2-sunscorch-badlands.md`. **Supersedes** the earlier
> "concentric rings" version of Phase 0 (built then reworked same session — the user found
> rings too uniform/predictable). Ships a **walkable, correctly-mapped, empty** outer world
> built on a Valheim-style **patchwork** biome-gen, with Biome 1 preserved exactly. Built on
> **Opus** (world-gen rework). Terrain only — no enemies/POIs/flora (later phases).

## Locked model (from this session's brainstorm)

Rings are out. The world is a **universal base layer** with **biome blobs painted on top**:

- **One universal base layer** across the whole world that **grades outward** — lush green
  near center (so Biome 1 is visually unchanged), drying to dusty/barren toward the rim.
  Underlies everything, including the forest. Shows through in the gaps between biome blobs.
- **Biome 1 = a solid protected forest disc** (r ≤ ~2000), exactly as it is today (its own
  `Biome.ts` forest/grassy/creek features, crisp). **No other biome ever seeds inside it.**
  The patchwork only exists *beyond* it ("this changes after Biome 1").
- **Outer patchwork (r > ~2000 → rim):** biome **blobs** (metaball-style coverage, not a
  space-filling partition — so there are single-biome chunks, blended overlaps, AND
  base-layer gaps between them). Which biome a blob is = drawn weighted by
  `danger = radialTier(r) + noise(x,y)`, **moderate** variance (clear outward tendency,
  frequent local pockets). Biome **types repeat** (several separate badlands chunks etc.).
- **Two levels:** a level-1 **biome-type coverage map** (`WorldBiomes`) decides
  forest/badlands/dunes/… at each point; each biome keeps its **own** feature generator (the
  existing `Biome` = forest; a second `Biome` = badlands mesa/flats/ravine; a third = dunes).
  So Biome 1's internal look is preserved byte-for-byte.

**To actually show the patchwork now** (only forest + badlands would still read as a uniform
outer zone), this pass adds **Dunes** as a second, **placeholder terrain-only** outer biome
(pale sand palette, higher danger tier than badlands) — no content/enemies. So the outer zone
visibly mixes **badlands (dusty red-brown) + dunes (pale sand) + base gaps**, with badlands
nearer the forest and dunes further out, moderately noisy. Real biome content is Phases 1–5.

**Locked feel:** dusty red-brown badlands (`BADLANDS_CLAY = 0x8f5a42`, done); world grown to
**`WORLD_RADIUS` ~14000** (28000px) with **~2x biome chunk size**; **moderate** danger
variance; **map opens centered on the player**.

## Systems

### `src/systems/WorldBiomes.ts` (new)
- `BIOME_TIERS` registry: `forest`(tier 1), `badlands`(tier 2), `dunes`(tier 3) — `dangerCenter`
  per biome; extensible (biomes 4–5 = added rows).
- `radialTier(r)`: 1 at the forest edge (~2000) ramping to ~4 at the rim — the outward danger
  gradient. `dangerAt(x,y) = radialTier(r) + valueNoise(x,y) * NOISE_AMP` (moderate amp ≈ 1).
- Seeded blob scatter (deterministic `sessionRng`): Poisson-ish seeds across the **outer**
  zone only (r > FOREST_CORE). Each seed's biome = the tier nearest `dangerAt(seed)`, clamped
  to available biomes; blob radius ~2× the old badlands (per-seed jitter) with a noisy edge.
- `coverageAt(x, y, biomeId): 0..1` — metaball falloff = max over that biome's seeds of a
  smoothstep from center→(radius+wobble). Overlapping blobs blend; gaps (all coverage low)
  fall back to the base layer.
- `forestCoverage(r): 0..1` — forced **1** for r ≤ FOREST_CORE (2000), smooth ramp to 0 by
  FOREST_EDGE (~2300). Keeps Biome 1 a solid disc; nothing else seeds there.
- `worldBiomeColorAt(x, y, ctx)` — the master terrain color both the bake and the map use:
  1. `base = lerp(GRASS, DUST, baseGrade(r))` (subtle green→dusty outward).
  2. blend forest terrain color (`forestTerrainColorAt(ctx.forest, …)`) by `forestCoverage`.
  3. blend badlands + dunes ground colors by their `coverageAt`.
  Single source of truth → the map can never drift from the ground.

### Palettes / features
- `Badlands.ts` — badlands palette (dusty) + `badlandsColorAt` + feature via a 2nd `Biome`
  (carried over from the ring version; the `BadlandsField` radial mask is **deleted**).
- `Dunes.ts` (new) — pale-sand palette + `dunesColorAt` + feature via a 3rd `Biome`
  (dune ridges = "forest" zone, sand flats = "grassy"; reuse verbatim).

## World geometry + rendering (bounded, my call)
- `WORLD_RADIUS` 9000 → **14000** (`WORLD_SIZE` 28000). `depth.ts` `WORLD_DEPTH_SCALE`
  0.13 → **0.09** (28000 × 0.09 = 2520 < 2600 HUD floor). Fog/`ExploredMap` grids auto-scale.
- **Bake, two layers (GPU-bounded, independent of world size):**
  - **Inner forest bake** — keep the current 4000² full-res RT (depth -9), but draw
    `worldBiomeColorAt` (biome-aware) so its corners past the forest disc read correctly.
    War-camp/vein floor stamps unchanged. Biome 1 stays crisp.
  - **Outer overlay** — ONE bounded `RenderTexture` (`OVERLAY_TEX` = 4096², ~64MB) baked by
    iterating texel-space (step ~4) and mapping each texel→world via `worldBiomeColorAt`,
    then displayed **stretched to the full world** (depth -9.5, below the crisp inner bake).
    ~6.8 world-px/texel — soft, fine for placeholder ground, and **constant cost at any world
    size**. The tiled ring bake is deleted.
  - grass tilesprite (-10) → outer overlay (-9.5) → inner forest bake (-9) → void ring (-8).

## Map
- `ExploredMap.terrainColorFn = worldBiomeColorAt` (already plumbed) → minimap + world map
  mirror the patchwork.
- `WorldMapUI.openMap` **centers pan on the live player position** (threaded from MainScene's
  per-frame `update(px,py)`), not world center. `contentRadius` → the full world radius now
  (content spans the whole world), or a sensible framing default.

## Samplers
- Forest spawners still restrict to `BIOME_RADIUS` → all Biome-1 content stays in the disc,
  unchanged. `pickBadlandsPoint`/outer spawners deferred to Phase 2 (no content this phase).

## Follow-up refinements (same session, from the user's feedback)
- **Biome ordering = radius sets a danger CEILING, not a fixed tier** (`WorldBiomes.ceilingTier`
  + `pickBiome`). A blob may be any biome with `tier ≤ ceiling(r)`, weighted toward the ceiling —
  so a higher-tier biome NEVER appears below its unlock radius (no out-of-order danger), but
  lower biomes (forest, badlands) can appear anywhere out in later-biome territory. **Forest is
  now itself a blob biome** (spawns in pockets beyond the disc); the center chunk stays
  biome-1-only via `forestCoverage`. Verified: dunes = 0 in every band before ~6500; forest
  present at all radii.
- **Current-biome HUD label** on top of the minimap + a **one-time discovery toast** (new
  `"biome"` `LogKind`, gold center toast) the first time each real biome is entered (forest
  pre-marked so the first toast is genuinely new). `BIOME_NAMES` = placeholder flavor.
- **Dev command:** `Ctrl+Shift+M` (`revealEntireMap`) clears all fog + opens the world map for
  worldgen inspection — undocumented (not in the Keybinds panel).

## Deliverable
Biome 1 forest disc is untouched and crisp; walking out, the base layer dries out and the
outer world is a **patchwork of badlands + dunes chunks with base gaps**, moderate outward
danger, correct on the minimap + full world map (which opens centered on you). Empty of
content. Verify visually + via `preview_eval` sampling coverage/danger at points.

## Conventions
- New Y-sort objects use `ysortDepth` (none this phase). No `RECIPES.md`/dashboard change.
- Update `STATUS.md`, `CLAUDE.md` roadmap, the umbrella plan (ring→patchwork), memory. Commit.
