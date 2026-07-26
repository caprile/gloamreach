# Plan: Gloaming Vein — mineable rarity-ore POI + trophy refinement

Status: **design locked with the user 2026-07-11** (via brainstorm + `AskUserQuestion`).
New mechanic → Opus. Off the master-plan build order (slots in ahead of M-TE as a
content+economy pass on the shipped M-RL relic loop). Fits the roguelike meta-loop's
"trophies → relics → replayability" spine — this adds a *gated* way to climb trophy
rarity, which the M-RL forge already rewards heavily (Uncommon trophies never fail a
roll).

## The loop this creates

Kill elites → pile of **raw Common** trophies (which, per the M-RL outcome table, crumble
**86.5%** of the time when rolled — feel-bad). Find + clear the ore POI → a rare finite
**magical resource**. Spend raw trophies + resource at the Relic Forge to **refine a raw
trophy one rarity up** — a Refined Uncommon trophy **never fails a roll** (100% floor +
5% Rare + 1% Mythic). So the ore redeems a stack of crumble-prone commons into guaranteed
relics with upside. Fully gated behind exploration + a mini-boss fight (the user: "I don't
like things to be free").

## Locked decisions (the user, 2026-07-11)

1. **Refine happens as a new "Refine" tab on the existing Relic Forge** (not a new station).
   The Gloam Shard is the real gate, so co-locating with rolling is thematic + least new
   architecture.
2. **Refined trophies are species-agnostic.** Any 3 raw Common trophies (mixed species OK)
   → 1 generic `refined_trophy_uncommon`. Species is already cosmetic for rolling (all raw
   trophies share the Common pool + pity), so this avoids item-key proliferation and
   stranded odd trophies.
3. **Hard-gate the vein:** the ore nodes are shielded/inert and **un-mineable until the
   guardian mini-boss is dead**, then they "crack open" (visible payoff for the kill).
4. **Single-step, terminal refinement** (the key rule):
   - **raw Common → Refined Uncommon** ✅
   - **raw Uncommon → Refined Rare** ✅ *(but raw Uncommons only drop in deeper biomes)*
   - **Refined Uncommon → Refined Rare** ❌ (blocked — refined trophies are roll-only,
     never a refine input)
   - Consequence: **biome 1 naturally caps at Refined Uncommon** (nothing here drops a raw
     Uncommon to make a Refined Rare from), yet the system already supports raw-Uncommon →
     Refined-Rare for M-W1's deeper biomes with zero rework. The "no refined→refined" rule
     is also what prevents an infinite laddering exploit.
5. **This deliberately overrides M-RL's "rarity is not climbable / no manual combine" lock.**
   The thing the user rejected then was an *ungated, free* relic-combine ladder. This is a
   *gated* climb (rare finite resource behind a mini-boss) — consistent with "nothing free,"
   and a different mechanic from the removed relic-combine.
6. **Biome-tiered ore.** Gloam Shard carries Tier 1; refinement requires `trophy.tier ==
   shard.tier` (both Tier 1 now, so no visible constraint yet). Deeper biomes (M-W1) get a
   higher-tier, differently-named/looking, differently-themed ore requiring a better pickaxe,
   yielding a higher-tier shard that only refines that biome's higher-tier trophies. Keep the
   refine table data-driven/tier-keyed so this is data, not a rewrite.

## First-pass numbers (tunable — the user OK'd; relic-strength retune is a later pass)

- **Vein POI:** 1 per run, forest, mid-distance from center (rare/notable, like the Boss
  Altar is unique). ~5 vein nodes clustered around the guardian.
- **Vein node:** Stone-Pickaxe-gated (KIND, per the existing prompt-gating rule — never
  reveal tier), **non-respawning** (permanent depletion like a boulder), ~2 hits each, drops
  **1–2 Gloam Shard**. Full clear ≈ **7–10 shards**.
- **Guardian mini-boss** guaranteed drop: **3–4 Gloam Shard** + **1 `refined_trophy_uncommon`**
  (a taste of the payoff).
- **Refine recipe (biome 1):** **3 raw Common trophies + 2 Gloam Shard → 1 Refined Uncommon.**
  A run yields ~12 raw commons + ~7–10 shards → ~3–4 refines possible, co-gated by both
  trophies *and* shards (neither a free pass).
- **Deeper-biome recipe (scaffold, not reachable in biome 1):** 3 raw Uncommon + 3 shard →
  1 Refined Rare.

## Names (working / placeholder-art)

- **Ore node / POI:** "Gloaming Vein" — purple crystalline rock jutting from a small rocky
  clearing. Distinct texture, purple.
- **Magical resource:** "Gloam Shard" (Tier 1, purple).
- **Guardian mini-boss:** "Gloamwarden" — an amethyst-mutated gremlin brute (stays
  gremlin-thematic for biome 1). Difficulty between an elite and the Gremlin King.
- **Refined trophy items:** `refined_trophy_uncommon` (Tier 1), `refined_trophy_rare`
  (scaffold).

## Implementation outline (integration points)

### Data / resources
- `Inventory.ts` `ResourceType`: add `gloam_shard`, `refined_trophy_uncommon`,
  `refined_trophy_rare`.
- `Items.ts` `ITEM_DEFS`: add the three items (shard = raw material; refined trophies mirror
  the existing trophy item shape). Descriptions must NOT spoil mechanics beyond what the
  player can see (follow the totem/cattail precedent).
- `BootScene.ts`: purple crystal icons — `icon_gloam_shard`, `icon_refined_trophy_uncommon`,
  `icon_refined_trophy_rare`, plus the ore-node world texture(s) (`gloaming_vein` +
  optionally a `gloaming_vein_shielded`/`_cracked` state).

### Relics / refinement
- `Relics.ts` `TROPHY_ROLL`: add `refined_trophy_uncommon → { uncommon, tier 1 }`,
  `refined_trophy_rare → { rare, tier 1 }` (roll-only keys).
- New **refinement table** (data-driven, tier-keyed), e.g. `REFINE_RECIPES`: input raw-trophy
  rarity + count + shard cost → output refined key. Only raw-trophy keys are valid inputs
  (never `refined_*`). A `refine()` helper (framework-free, like `roll()`) validates the
  player owns ≥N raw trophies of the input rarity + ≥M shards, consumes them, returns the
  refined key. Biome 1 exposes only the Common→Uncommon row.

### Relic Forge UI (`RelicForgeMenu.ts`)
- Add a **"Roll" / "Refine" tab toggle**. The Refine tab lists available refine recipes
  (input filter: raw trophies the player owns, grouped by rarity), shows cost (N trophies + M
  shards) + a live "→ 1 Refined Uncommon" preview, and a Refine button.
- Reuse the timed `ProgressBar` (5p) with the commit-at-end + `busy` + cancel-on-close
  pattern (same as craft/process/cook). Announce the result at bar completion (event log).
  This is a plain refine, NOT the slot-machine `RelicRevealFx` (that's for rolling).

### The POI (world-gen, `MainScene`)
- Pick a vein position once per session (deterministic via `sessionRng`), similar to
  `pickAltarPosition()` — reuse the **`WAR_CAMP_CLEAR_RADIUS`-style no-spawn exclusion zone**
  pattern so ordinary nodes/enemies don't scatter through the vein clearing
  ([[feedback_poi_busy_not_placeholder]]). Place it a sensible distance from both center and
  the war camp.
- Spawn ~5 vein `ResourceNode`s around it (Stone-Pickaxe-gated, non-persistent, drop
  gloam_shard). Start them **shielded/inert**; the guardian's death flips them mineable
  (swap texture `_shielded` → `_cracked`/mineable, enable the interact).
- Spawn the **Gloamwarden** guardian anchored at the vein.
- **Night glow (purple):** push the vein's world position(s) into the `collectLights()` path
  (the `campLightPoints` brazier pattern), tinted purple — doubles as a navigation hint at
  night, like the war camp glows. Reset any new light-point array in `create()` per the
  `scene.restart()` field-init gotcha.
- **Minimap landmark:** once explored within `REVEAL_RADIUS`, burn a distinct landmark via
  `MinimapUI.revealLandmark()` (a new color, e.g. purple) — same discovered-fixed-structure
  treatment as the altar/shacks. No live entity blip (locked minimap rule).

### The guardian (`src/entities/Gloamwarden.ts`)
- Bespoke AI (per the "no shared boss framework" lock) following `GremlinKing`'s
  telegraph/poise pattern but **lighter** — ~2 telegraphed attacks, a small poise/stagger
  bar, difficulty between an elite and the King. Extends `Enemy` (keeps HP-bar/loot/death
  machinery), fully overrides `update()` (Snake/Boar/GremlinKing precedent).
- On death: flip the vein nodes mineable + drop the guaranteed shards + refined-uncommon
  taste. Classify its kill for run score (reuse `elite`? or a new tier — decide at build:
  simplest is score it as an elite-tier kill, or add a mini-boss score band).

### Cross-cutting / docs
- `create()` resets any new per-run fields (vein position, guardian ref, light points,
  discovered flag) per the `scene.restart()`-doesn't-reinit gotcha
  ([[feedback_scene_restart_full_reset]]).
- `RECIPES.md` + the balancing dashboard (`src/dashboard/main.ts`): add the refine recipe
  + the new items. The dashboard imports `Relics` live, so the `REFINE_RECIPES`/`TROPHY_ROLL`
  additions surface automatically; the Gloamwarden's stats go in the **manually-mirrored
  Enemies tab**.
- `STATUS.md` / `CLAUDE.md` roadmap on ship.

## Open sub-decisions to resolve at build time
- Guardian's exact attack kit + poise numbers (bespoke — decide when writing the class).
- Whether the vein POI is guaranteed 1/run or has a small spawn chance.
- Guardian kill's score classification (elite band vs a new mini-boss band).
- Exact refine-tab layout in the forge menu.

## Verification plan
- `tsc --noEmit` clean.
- Live `preview_eval`: new items/textures load; `refine()` consumes 3 raw commons + 2 shards
  → 1 refined uncommon, rejects refined-key inputs, respects tier; forge Refine tab renders +
  the ProgressBar commits at end + cancels on close; the refined uncommon rolls with the
  Uncommon outcome table (never fails).
- Live: vein spawns in its cleared zone with no nodes inside; nodes are un-mineable until the
  Gloamwarden dies, then mineable + drop shards; purple night glow + minimap landmark.
- `preview_screenshot` of the POI (day + night glow) and the forge Refine tab.

## As-built (SHIPPED 2026-07-11, roadmap 5w — resolves the open sub-decisions + the user's post-ship tweaks)

Built on Opus. Everything above shipped as designed except where noted below.

**Open sub-decisions, resolved:**
- **Guardian attack kit** — TWO bespoke attacks, and (per the user's playtest feedback)
  deliberately NOT the roster's charge/radial-slam, which read as "Boar charge / Gremlin King
  slam again": a **Leaping Smash** (leap to a locked landing spot + 95px AoE, 22 dmg + kb —
  kept on purpose to *preview* the Gremlin King's own leaping smash) and a **Gloam Eruption**
  (the warden roots itself and channels ~920ms, then crystal spikes erupt at the player's
  LOCKED ground spot, 72px, 24 dmg + small launch — boss stays put + vulnerable = a punish
  window; dodge = leave the marked ground). Neither is a charge (no line rush) nor a
  boss-centered radial slam. Poise 60 → stagger 2.5s (×1.5 punish).
- **Vein POI frequency** — guaranteed **1 per run** (like the Boss Altar).
- **Guardian kill score** — scored at the **elite** band (`classifyKill` returns `"elite"` via
  `instanceof Gloamwarden`); no new mini-boss band was added.
- **Refine-tab layout** — a recipe LIST with per-row cost readout + a Refine button (a timed
  `ProgressBar`, commit-at-end).

**The user's post-ship tweaks (locked):**
- **Refine is gated behind Relic Forge Lvl 2**, not just a tab. A new **Gloam Conduit** station
  upgrade (`StationUpgrades.ts`, **15 Stone + 1 Gloam Shard**, workbench-gated like every
  tier-1-base upgrade) unlocks it — so you can't refine until you've mined at least one shard.
  Below Lvl 2 the **Refine tab is hidden ENTIRELY** — no locked tab, no hint (an initial ship
  showed a "sealed — upgrade to Lvl 2" hint; the user rejected it).
- **Unique ore-area look** (the vein must read as its own place, like the war-camp floor does
  for the altar): `buildBiomeTexture()` stamps a distinct **gloam-blighted crystalline floor**
  (dark-violet wash + amethyst core) over the clearing, plus **10 decorative
  `gloam_crystal_cluster` props** scattered around it (a few also glow at night).
- **"Bind", not "Roll"** — the roll tab is labelled **Bind** in-universe (the forge "binds
  monster trophies into relics"), pairing with **Refine**. Internal id stays `"roll"`.

See `STATUS.md` (### Just finished: Gloaming Vein) for the full ship writeup + verification.
