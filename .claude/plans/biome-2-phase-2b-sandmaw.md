# Biome 2 — Phase 2b: Sandmaw (the 4th native badlands creature)

> Phase 2b of the `biome-2-sunscorch-badlands.md` umbrella — the "+1 native creature"
> deferred out of Phase 2's core-3 scope. Built on **Opus** (new enemy AI / state machine).
> Creature identity locked with the user via `AskUserQuestion`: **a burrowing ambusher**
> (over an aerial diver or a stealth flanker).

## What this delivers

One bespoke enemy — the **Sandmaw** — a gloam-touched burrowing ambush predator, giving the
badlands roster a fourth, genuinely distinct threat vector. The existing trio covers
**swarm pounce** (Duskrunner), **armored roll-tank** (Cragscale), and **stationary
flame-mage** (Hexling); the Sandmaw adds **"watch the ground / don't stand still near a
lurker."** No new systems — it reuses the ambush/telegraph/`checkPlayerHit`-AoE machinery
already built.

### Sandmaw — burrowing ambusher (`src/entities/Sandmaw.ts`)
- **Lore:** a gloam-touched sand predator of the Sunscorch flats; it lurks submerged and
  erupts on anything that wanders over it.
- **AI (own state machine, fully overrides `update()`, does NOT call super):**
  `submerged → surfacing → erupting → exposed → burrowing → submerged`.
  - **submerged** — near-invisible (alpha 0.18, like a subtler Snake), slow-stalks toward a
    player within `STALK_RADIUS` (240px) but outside the ambush ring to reposition and
    re-ambush; holds still otherwise (a slow drift so it isn't an invisible shove). Triggers
    when the player enters `AMBUSH_RADIUS` (62px) off cooldown.
  - **surfacing** — pops to full alpha + a `playWindupTell` load-up, and grows a dust-ring
    telegraph previewing the exact burst radius. `SURFACE_WINDUP_MS` 560ms is the dodge
    window (clear the ring).
  - **erupting** — a radial **sand-burst** (`BURST_RADIUS` 95px, 38 physical + 220
    knockback), one hit per eruption, dealt via `checkPlayerHit()` (queried by the scene like
    the bosses / Hexling flame — NOT a melee bite; `biteDamage: 0`).
  - **exposed** — fully surfaced + planted `EXPOSED_MS` (1100ms): the vulnerable punish
    window (the reward for dodging).
  - **burrowing** — dives back under (`BURROW_MS` 350ms), then `RESUBMERGE_COOLDOWN_MS`
    (2600ms) before it can ambush again.
- **Numbers (first-pass):** HP 45 (between Duskrunner 20 / Cragscale 60), erupt 38 (~25 net
  through the 13-flat Lvl-3 armor cap — in line with the badlands-rebalance tier). Elite ×1.5
  HP/dmg, ×1.1 speed, ×1.3 scale, 2× loot, crimson/gold recolor.
- **Dodge math:** a walking player (95px/s) covers ~52px in the 560ms wind-up; from
  `AMBUSH_RADIUS` (62px in) they can just clear `BURST_RADIUS` (95) with a beat of reaction —
  greedy/advancing players eat it, reactive ones (or a dash, which also grants i-frames)
  escape. Same movement-dodgeable principle as 5t's smash-radius fix.
- **Resist profile (locked):** `{ pierce: 0.6, blunt: 1.4 }` — resists pierce (hard to pin a
  burrower with a thrust), weak to blunt (concussed by a heavy blow). Deliberately the
  **inverse of Cragscale** (weak-pierce / resist-slash), so clubs/warhammer shine on Sandmaws
  where the Primal Spear shines on Cragscales — the damage-type layer now rewards carrying
  more than one weapon into the badlands.
- **Reveal-and-retaliate:** attacked while submerged (e.g. a weapon-arc sweep catches the
  mound) → surfaces and erupts, mirroring Snake/Hexling's `takeHit()` override.
- **`isAggro()`** hidden while submerged (HP bar shows only once surfaced) — like Snake.
- **Spawn:** scattered **lone** ambushers (no pack — a lurker is a solo trap), `SANDMAW_COUNT`
  24 via `pickBadlandsPoint`, in `spawnBadlandsEnemies()`. Elite via `rollElite`.
- **Loot:** `sandmaw_chitin` ×1 (×2 elite) — a light-but-tough plating shard (future
  armor/tool material, no recipe yet). Elite + `sandmaw_trophy` (Common/tier1 in
  `TROPHY_ROLL`, same as the other badlands trophies — Phase 5 retiers to tier-2 + Ember).

## Systems touched
- **`src/entities/Sandmaw.ts`** (new) — the subclass + its own telegraph Graphics.
- **`src/systems/Inventory.ts`** — `sandmaw_chitin`, `sandmaw_trophy` `ResourceType`s.
- **`src/systems/Items.ts`** — `ItemDef` entries (Gloamreach flavor) for both.
- **`src/systems/Relics.ts`** — `TROPHY_ROLL.sandmaw_trophy` (Common / tier 1).
- **`src/scenes/BootScene.ts`** — `drawSandmaw` (`sandmaw` + `sandmaw_elite`, 26×18 plated
  burrower facing right), `icon_sandmaw_chitin`, `icon_sandmaw_trophy`.
- **`src/scenes/MainScene.ts`** — import Sandmaw; scatter 24 in `spawnBadlandsEnemies()`; add
  `Sandmaw` to the `checkPlayerHit` area-damage `instanceof` union.
- **`src/dashboard/main.ts`** — Enemies-tab entry (manual mirror) + trophy-source map row.

## Deliberately NOT in scope
- Any recipe use of `sandmaw_chitin` (Phase 4+ / future alchemy).
- Tier-2 trophy/relic economy (Phase 5) — sandmaw_trophy is Common/tier1 now.
- The biome-aware enemy-respawn top-up (still forest-species-only, pre-existing; a Phase
  2b/M-W1 follow-up — unchanged this session).

## Verification (done)
- `tsc --noEmit` clean; `preview_start` boots, no console errors.
- `preview_eval`: 24 Sandmaws spawn, all 4 textures load; full state cycle
  submerged→surfacing(α1)→erupting→hit `{38, kb220}`→single-hit-per-erupt→exposed→burrowing→
  submerged(α0.18); a player 300px out at erupt time = no hit (dodge); resists pierce×0.6 /
  blunt×1.4 / slash×1.0; takeHit while submerged flips to surfacing; `isAggro()` false while
  submerged. Sprite + elite recolor render correctly (fixed-overlay art check).

## Conventions honored
- Enemy base Y-sorts via `ysortDepth` (inherited — no raw `y`).
- Updated `STATUS.md` (Current State + Recent Entry), the dashboard Enemies tab, `CLAUDE.md`
  roadmap/biome-2 status, and the biome-2 memory. No `RECIPES.md` change (no new recipes).
- This plan committed into `.claude/plans/`.
