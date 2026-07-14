# Badlands playtest triage (2026-07-13)

A large playtest-feedback dump from the user, triaged into 6 self-contained sessions so
each can run in a fresh chat with minimal shared context. Each session reads **its own
section + the Locked Decisions block below**. Order: Session 1 (metal) first per stated
priority; 2–6 are independent and can run in any order. Sessions 5+6 may merge if fewer
chats are wanted.

Model tag per session follows the model-switch convention (Opus for new mechanics/combat
balance, Sonnet for fixes/UI/tuning on existing systems).

## Locked decisions (answered via AskUserQuestion, 2026-07-13)

1. **Smelt ratio → 1 ore + 1 hex essence → 1 ingot** (was 2 ore + 1 hex). Apply the same
   1:1 principle to Embersteel (1 ember ore + 1 hex → 1 ingot; was 2 ore + 2 hex).
   *Watch-item:* with 1:1 fuel, Hex Essence supply could become the new bottleneck —
   verify Hexling/hex drop rate keeps up, or the fuel gate just becomes the grind.
2. **Embersteel heavy set bonus (Molten Bulwark):** drop the knockback-immunity; new
   bonus = **fire thorns + flat % incoming-damage reduction** (pure heavy-tank identity).
3. **Badlands fire resistance:** **Sandmaw + Cragscale = fire-resistant; Hexling =
   fire-weak; all other badlands enemies neutral.** (Counterweight to Emberblink's OP
   landing fire-nova — makes fire situational, not dominant.)
4. **POI respawn:** **ALL POIs respawn EXCEPT boss-summon altars.** Warren dens, Gloam
   Vein, and the Sunken Forge each respawn on a timer after being fully cleared (mini-boss
   + nodes/loot re-arm). Only the tyrant/gremlin summon altars stay one-shot.

## Assumed balance targets (state, veto in-session if wrong)

- **Anti-grind (S1):** a full *base* forged set + all Workbench/Smelter upgrades reachable
  in ~10–12 min of casual badlands play; Ember/T2 gear is a stretch goal, never a wall.
- **Duneshaper (S2):** should ~3–4 shot a player in Lvl-1 sand armor and resist easy
  stagger-locking — a real gate, not a speed bump.

## Current numbers found (grounding for S1/S2)

- Sunscorch ore: 44 nodes × 1–2 each; smelt 2 ore + 1 hex → 1 ingot (~0.75 ingot/node).
- Ember (Cinderforged) ore: only 8 nodes × 1–2; smelt 2 ore + 2 hex → 1 embersteel ingot.
- Clay: 40 nodes × 1–2.
- Weapon damage (base, pre-upgrade): primal_spear 8; sunsteel pike 12 / warhammer 14;
  embersteel pike 17 / warhammer 20 / longsword 15; ember_brand 14. **Must check
  max-UPGRADED primal_spear in S1 — sunsteel likely sits below it, which is the bug.**
- Duskhide light armor: 3/4/3 = 10 total. (Compare vs Gremlin Lvl 3 in S1.)
- Duneshaper: HP 900, poise 120, scale 2.3; attacks volley 24 / spikes 50 (physical) /
  nova 42 / lance 46 / barrage 30 (rest magic, bypass flat armor).

---

## Session 1 — Badlands metal economy & forged-gear balance ⭐ TOP PRIORITY · Opus — ✅ SHIPPED (2026-07-13)

The "not grindy" pass. Interlocking economy — do as one session.
- Sunscorch ore: more per node (a handful) + denser scatter.
- Ember ore: **way** more at the Ember POI (Cinderforged veins are only 8×1–2 today).
- Smelt ratio → **1 ore + 1 hex → 1 ingot** (both sunsteel & embersteel; decision 1).
- Sunsteel weapons must exceed the **max-upgraded** Primal Spear (compute it first).
- Sunsteel/forged armor curve; **Duskhide Lvl 1 ≥ Gremlin Lvl 3**.
- **Duskhide uses zero metal** (remove ingots from its recipe).
- Add a dedicated **fuel slot** to the Smelter menu (currently fuel pulls silently from
  the backpack).
- Files: `MainScene.spawnBadlandsMinerals`, `Processing.ts` (SMELT_RECIPES),
  `Recipes.ts`, `Weapons.ts`, `Items.ts` (armor values), `DryingRackMenu.ts` (fuel slot),
  `RECIPES.md`, dashboard.

## Session 2 — Badlands boss & enemy combat tuning · Opus — ✅ SHIPPED (2026-07-13)

- **Duneshaper:** projectiles → beam-like (like the Gremlin's); **6 not 3**; near-instant
  beam with a short react window (less wind-up so it's not trivially sidestepped); **more
  damage** across attacks; **tankier + harder to stagger** (poise up / stagger punish
  down). Target: real threat vs Lvl-1 sand armor + max wood spear.
- **Cinderwrought:** harder + harder to dodge (playtest took zero hits).
- **Hexling:** teleports too much — cut blink frequency / add cooldown.
- **Fire resistance** per decision 3 (Sandmaw + Cragscale resist, Hexling weak, rest
  neutral) — data-only via `EnemyConfig.resistances`.
- Files: `Duneshaper.ts`, `Cinderwrought.ts`, `Hexling.ts`, enemy configs, dashboard.

## Session 3 — Relic Forge menu UI + "all relic effects" panel · Sonnet

- Fix relic list overlapping the `Forged: X` result text (see screenshot).
- Fix relic list crowding when all 8 families are filled (wrap/scroll).
- Group displayed relics **by tier** (see what a T1 gets replaced by a T2).
- New **"all relic effects"** view: total aggregated effect list + hover a stat → which
  relic grants it. (Likely lives on the Inventory Relics column added in Phase 5.)
- Files: `RelicForgeMenu.ts`, Inventory relics column, `Relics.ts` (per-stat contribution
  getter if needed).

## Session 4 — Badlands POI placement, respawn & spawn bugs · Sonnet

- **POI spacing:** min gap between POIs; push **boss/forge deeper** from the woods disc.
  Warren dens may stay near-ish. (Check `pickBadlandsPoint` + per-POI clear radii /
  min-distance-from-BIOME_RADIUS.)
- **General POI respawn** per decision 4: Warren dens + Gloam Vein + Sunken Forge respawn
  on a timer after full clear; boss-summon altars excluded.
- **Bug:** nighttime surge spawns *forest* enemies in the badlands (night batch uses the
  forest roster regardless of biome — make it biome-aware).
- **Warren dens:** add a delay between wave-1 clear and wave-2 spawn/aggro (they
  insta-popped and insta-aggro'd).
- Files: `MainScene` pick*/POI-spawn/respawn/night-batch/warren-wave code.

## Session 5 — Recipe/upgrade gating & dev-command bugs · Sonnet

- Workbench Lvl 3 recipes (Sunsteel etc.) should unlock **only after** the player first
  reaches Workbench Lvl 3 — not on recipe-discovery before the upgrade is applied.
- Ember Crucible upgrade only appeared after **picking up the Smelter** — should show
  while it's placed.
- `nobuildcost` dev cmd: should **not** permanently unlock all recipes, and **should**
  also grant free upgrades (currently inverted).
- Files: `Crafting.ts`, recipe gating, `StationUpgrades.ts`, `__dev` console.

## Session 6 — UX & text polish grab-bag · Sonnet

- Effigy description still says "fetch" (renamed to Totem in 5aj; description stale).
- Emberblink description runs off-screen — wrap/clamp the tooltip.
- **Embersteel heavy set bonus** per decision 2: remove knockback-immunity → fire thorns
  + flat damage reduction (`SetBonuses.ts` + tooltip).
- Crafting table / Drying Rack hard to see against the badlands background — add contrast/
  outline.
- Inventory sort **grouped by biome** (`ItemContainer.sortAndStack`).
- Drag from an **equipment slot → the destroy/trash area** in the inventory (last missing
  drag path).
- Files: `Items.ts`, `SetBonuses.ts`, station textures, `ItemContainer`, Inventory drag.

## Captured, no action
- "Embercleave damage feels good" ✅ (positive — leave as-is).
