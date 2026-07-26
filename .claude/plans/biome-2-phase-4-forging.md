# Biome 2 — Phase 4: Smelting, forging tier & the Gremlin King gate

> Phase 4 of the biome-2 umbrella (`.claude/plans/biome-2-sunscorch-badlands.md`). Built on **Opus**
> (new mechanic: smelting station + a new gear tier + new gating). **Sliced into two sessions** per
> The user. **On approval, copy this file into the repo's `.claude/plans/` (as
> `biome-2-phase-4-forging.md`) and commit it** per `feedback_plans_must_be_in_repo`.
>
> **This plan file covers BOTH sessions; only Session 1 is built now.** Session 2's catalog is
> outlined so the Session-1 data/gating is laid out to receive it without rework.

## Context

Phase 3 shipped the badlands boss + POIs, leaving the deferred **Gremlin King critical-drop rework**
(locked decision 10 — the King must drop something with "huge impact" on biome-2 gear). This phase
builds the forged-gear tier and wires the King into it. The badlands already seeds the raw inputs
(`cragscale_plate`, `hex_essence`, `sandmaw_chitin`, `duskrunner_pelt`, `ember_ore` — all flagged
"future smithing/armor/weapon material").

## The full forged progression (both sessions)

```
Mine Clay  ─────────────────────────► build SMELTER (Clay + Stone)
Mine Sunscorch Ore (common) ─┐
Hexlings drop Hex Essence  ──┴─ smelt (ORE + HEX ESSENCE = INGOT) ► Sunsteel Ingot (basic)
Sunsteel Ingot ► upgrade WORKBENCH to Lvl 3 (Forge Anvil) ► unlocks BASE forged recipes:
      • base HEAVY set (3) + base LIGHT set (3) + base weapons (blunt/slash/pierce)
Kill GREMLIN KING ► drops HEART ► upgrade SMELTER (Ember Crucible) ► unlocks smelting the RARE ore
Mine Cinderforged Ore (rare, ember_ore) + Hex Essence ─ smelt ► Embersteel Ingot (T2)
Embersteel Ingot ► upgrade WORKBENCH to Lvl 4 (Emberforge Anvil) ► unlocks T2 recipes:
      • ENHANCED reforge of each base piece (base piece + Embersteel Ingot + … = new item)
      • the first MAGIC weapon — a melee-range fire brand, RARE-ore-exclusive
```

- **Smelting is `A + B = Ingot`**: ore (loaded into the Smelter) + **Hex Essence** (consumed from the
  backpack as fuel). Reuse the existing `hex_essence` Hexling drop (locked: no new fuel resource).
- **Clay** = Smelter **build material only** (locked — not consumed per-smelt).
- **King's Heart** gates the **Smelter upgrade** → rare-ore smelting (locked — NOT the basic Smelter/
  basic ore; basic smelting works without ever fighting the King).
- **Enhanced gear is a standalone craft recipe that consumes the base piece** (locked — *not* the
  right-click Upgrade system): `Base Cuirass + Embersteel Ingot (+…) = Enhanced Cuirass`, a new item in
  the crafting menu. Both the light and heavy sets (and weapons) are enhanceable this way.
- **Workbench levels** (1-based display = `tier+1`): Lvl 1 base → **Lvl 2** Tool Sharpener (exists) →
  **Lvl 3** Forge Anvil (basic ingots → base forged recipes) → **Lvl 4** Emberforge Anvil (T2 ingots →
  enhanced/T2 recipes). "T2 metal can't be used in a recipe until the bench is Lvl 4."
- **Benches change appearance per tier** (Workbench + Smelter) — a distinct texture at each level.

---

## SESSION 1 (build now): smelting economy + base forged gear

### New resources (`Inventory.ts` `ResourceType` + `Items.ts` `ItemDef` + `BootScene` icons)

| Key | Name | Source | Notes |
|---|---|---|---|
| `clay` | Clay | mined from scattered **Clay Deposit** nodes (badlands, common) | Smelter build material |
| `sunscorch_ore` | Sunscorch Ore | scattered badlands (common, ~44) | → Sunsteel Ingot |
| `ember_ore` (EXISTS) | Cinderforged Ore | Sunken Forge POI **+ new rare scattered veins (~8)** | → Embersteel Ingot |
| `sunsteel_ingot` | Sunsteel Ingot | Smelter (basic) | base gear + Workbench Lvl 3 |
| `embersteel_ingot` | Embersteel Ingot | Smelter Lvl 2 (needs King's Heart) | T2 recipes (Session 2) |
| `gremlin_king_heart` | Gremlin King's Heart | **Gremlin King** (replaces the fang drop) | Smelter upgrade |

- `hex_essence` (EXISTS, Hexling drop) becomes the **smelt fuel** — no new item.
- New mineable nodes (`ResourceNode`, `action: "mine"`, Stone-Pickaxe, non-shielded, finite): Clay
  Deposit + Sunscorch Ore + rare Cinderforged veins (reuse the Sunken-Forge Ember-Deposit node
  texture). `MainScene.spawnBadlandsMinerals()` scatters them via `pickBadlandsPoint` (honors all POI
  exclusion zones); Y-sort via `ysortDepth`; reset the new arrays in `create()`.

### The Smelter (new station — mirrors the Drying Rack, with A+B smelting)

- **New placeable** `smelter` (`Items.ts` + `Recipes.ts`, category `crafting`, **tier 1** Workbench-
  gated). Build cost e.g. `{ clay: 10, stone: 15 }` — **no King drop** (basic smelting is King-free).
- **Reuse the processing pipeline, parameterized + fuel-aware:**
  - `Processing.ts`: add `SMELT_RECIPES` and give `ProcessRecipe` an optional
    `fuel?: { key: ResourceType; per: number }` (Hex Essence per output) and `minStationTier?: number`
    (rare ore = tier 1). Give `ProcessingStation` a `recipes` arg (default `PROCESS_RECIPES`; Smelter
    gets `SMELT_RECIPES`) + a `setTier(n)`/tier field so `canAccept`/lookup filter out recipes above
    the station's tier. Replace module-level `processRecipeFor` calls with `this.recipes`.
  - `DryingRackMenu.ts` (the generic processing menu): add optional deps `title`, `descKey`,
    `actionLabel`/`busyLabel` (default to rack values) **and** optional **fuel** support — a
    `fuelInfo?: () => { key; have; needPerOutput }` dep that renders a "Fuel: N/M Hex Essence" line and
    gates the Process button when short. Reuse the **same class** for the Smelter (no new UI file).
  - `MainScene.ts`: clone the Drying Rack wiring — `smelters: { image; station }[]`, a second menu
    instance (`station: () => this.openSmelter`, `stationTier` read from the placed image's tier like
    `forgeTier()`, `fuelInfo` reading the backpack's `hex_essence`), `hoveredSmelter` /
    `promptForSmelter` → `"[LMB] Use Smelter"` / `openSmelterMenu`, push
    `{ image, station: new ProcessingStation(SMELT_RECIPES) }` on placement (call `setTier` from image
    data), splice on destroy. `processAmount` for the smelter also deducts `hex_essence` fuel from the
    backpack (no-op + message if short).
- **Smelt recipes:** `Sunscorch Ore ×2 + Hex Essence ×1 → Sunsteel Ingot ×1`; `Cinderforged Ore ×2 +
  Hex Essence ×2 → Embersteel Ingot ×1` (`minStationTier: 1`). Ratios first-pass.

### Gremlin King → Heart → Smelter upgrade

- `GremlinKing.ts` loot: change the drop from `gremlin_king_fang` to `gremlin_king_heart` (still
  `min:1,max:1`). Repurpose/retire the fang (keep the item def as legacy or remove; the Heart is the
  live drop). King's win/score classification unchanged (Duneshaper is the win).
- **Smelter upgrade** (`StationUpgrades.ts`, new row): "Ember Crucible", `appliesToItemKey: "smelter"`,
  `resultTier: 1`, `costs: { gremlin_king_heart: 1, stone: 10 }`, `deltaLabel: "Smelt rare ore"`. The
  Smelter's tier is read by the menu to unlock the rare-ore recipe (`minStationTier: 1`).

### Workbench Lvl 3 + recipe-tier gating (new `Recipe` field)

- `StationUpgrades.ts`: new row "Forge Anvil", `appliesToItemKey: "workbench"`, `resultTier: 2`,
  `costs: { sunsteel_ingot: 5, stone: 10 }`, `deltaLabel: "Unlocks forged gear"`.
- **New `Recipe.requiresWorkbenchTier?: number`** — enforce in `MainScene.craftRecipe` +
  placement + `upgradeBlockReason`-style live gate, reusing `isNearWorkbenchAtTier` (already exists).
  Base forged recipes set `requiresWorkbenchTier: 2` (Lvl 3). The CraftingMenu shows the live
  "Requires Workbench Lvl 3" line, mirroring the existing "Requires a nearby Workbench" pattern.
  Discovery gates on ingredients-known (ingots) as usual; the bench-tier is a craft-time gate.

### Base forged gear (from Sunsteel Ingot; `requiresWorkbenchTier: 2`)

**Heavy set — Sunsteel** (`armorType: "heavy_armor"`, base > light's 7, grindy, no mobility penalty):

| Piece | Slot | `armorDefense` | Recipe |
|---|---|---|---|
| Sunsteel Helm | helmet | 4 | `{ sunsteel_ingot: 2, cragscale_plate: 2 }` |
| Sunsteel Cuirass | chest | 6 | `{ sunsteel_ingot: 4, cragscale_plate: 4, bones: 5 }` |
| Sunsteel Greaves | legs | 4 | `{ sunsteel_ingot: 2, cragscale_plate: 2, sandmaw_chitin: 2 }` |

**Light set — Duskhide** (`armorType: "light_armor"`, forged-light, leather-forward):

| Piece | Slot | `armorDefense` | Recipe |
|---|---|---|---|
| Duskhide Hood | helmet | 3 | `{ duskrunner_pelt: 3, sunsteel_ingot: 1 }` |
| Duskhide Vest | chest | 4 | `{ duskrunner_pelt: 5, sunsteel_ingot: 2, sinew?/bones: 3 }` |
| Duskhide Leggings | legs | 3 | `{ duskrunner_pelt: 3, sunsteel_ingot: 1, sandmaw_chitin: 1 }` |

- Both sets gate `requiredSkills: [{ heavy_armor|light_armor, 0 }]` (categorization only — avoids the
  chicken-egg where you'd need armor XP to craft the first piece; mirrors the Gremlin set's
  `light_armor: 0`). **No right-click ArmorUpgrades** for these — their progression is the Session-2
  enhance recipe (per the user: "not an upgrade, a full new recipe").
- **`heavy_armor` XP is free** — the kill path already awards per worn piece via
  `armorTypesWornPerPiece`; a worn Sunsteel piece starts accruing `heavy_armor` with zero new code.
- **`heavy_armor` skill effect (its identity vs light):** partial **magic/fire mitigation** (the "magic
  resist arrives in biome 2" hook). In `applyDamageToPlayer`'s existing `bypassesArmor(dmgType)` branch,
  if the player wears ≥1 `heavy_armor` piece, reduce the (otherwise armor-ignoring) damage by
  `heavyArmorMagicMitigation(skills)` — a new `Skills.ts` helper (~0.4%/lvl, cap ~30%; floor 1). Update
  `skillImpactDescription("heavy_armor")`. Light armor keeps its dodge identity (dash i-frames via
  `light_armor`). First-pass numbers.

### Base forged weapons — one per melee damage type (from Sunsteel Ingot; `requiresWorkbenchTier: 2`)

Extend `WeaponType` (`Weapons.ts`) with three keys; TS forces an entry in every `Record<WeaponType,…>`
table (damage/cooldown/stamina/types/base-crit/arc) so nothing is missed. Each: `ItemDef` (`weapon:` +
stats), `BootScene` icon + equipped-on-sprite visual, `Recipes.ts` recipe.

| Weapon | Type | Dmg / CD / Stam | Arc | Recipe |
|---|---|---|---|---|
| Sunsteel Warhammer `sunsteel_warhammer` | blunt (wide sweeper) | 14 / 800ms / 20 | `{55°, 62, 0.75}` | `{ sunsteel_ingot: 4, cragscale_plate: 2, wood: 4 }` |
| Sunsteel Longsword `sunsteel_sword` | slash | 10 / 480ms / 12 | `{30°, 40, 0.55}` | `{ sunsteel_ingot: 3, wood: 2 }` |
| Sunsteel Pike `sunsteel_pike` | pierce | 12 / 620ms / 15 | `{40°, 56, 0.65}` | `{ sunsteel_ingot: 3, wood: 3 }` |

- Covers blunt/slash/pierce so no melee build is stranded at the forged tier (locked). **Ranged &
  magic are intentionally not in the base tier** — magic is the Session-2 rare-exclusive fire weapon; a
  forged ranged option is a flag for the user (not built unless requested — the ranged pipeline exists,
  so it's a trivial later add). Base-crit: warhammer slow → `0.08/1.6`; sword `0.05/1.5`; pike
  `0.07/1.55`.

### Bench visual-per-tier (Workbench + Smelter)

- Give each level its own `BootScene` texture (`workbench` Lvl 1–3, `smelter` Lvl 1–2 this session;
  Workbench Lvl 4 + Smelter art land alongside Session 2). Extend `MainScene.applyTierVisual(image,
  tier)` to **swap the placed object's texture** for these keys (it currently only tints/badges), so an
  upgraded bench visibly reflects its latest tier; the tier already survives Destroy→pickup→replace, so
  the look follows the tier for free.

---

## SESSION 2 (planned, NOT built now): the T2 enhanced tier

- **Workbench Lvl 4** (`StationUpgrades.ts` "Emberforge Anvil", `resultTier: 3`, costs Embersteel
  ingots; discovery unlocked once a rare ingot has been smelted). T2 recipes gate
  `requiresWorkbenchTier: 3`.
- **Enhanced armor (6)** — standalone recipes consuming the base piece: `base piece + embersteel_ingot
  (+…) → enhanced piece` (Embersteel heavy set + Emberhide light set). Requires widening `Recipe.costs`
  to accept any item key (`Record<string, number>`) so a crafted armor item can be an ingredient; the
  base piece must be **unequipped/in the backpack** to reforge (note the caveat).
- **Enhanced weapons (3)** — same pattern for the three base forged weapons.
- **First magic weapon** — a melee-range **fire brand** (`magic` damage type, fire-flavored), **rare-ore
  exclusive** (`embersteel_ingot` + `hex_essence`), `requiresWorkbenchTier: 3`. First real `magic`
  weapon-skill XP source; showcases the resist layer.
- Bench Lvl 4 texture.

---

## Critical files (Session 1)

- `src/systems/Processing.ts` — `SMELT_RECIPES`, `ProcessRecipe.fuel`/`minStationTier`,
  `ProcessingStation(recipes, tier)`.
- `src/ui/DryingRackMenu.ts` — optional title/desc/verb + fuel readout/gate deps (Smelter reuse).
- `src/scenes/MainScene.ts` — `smelters[]` + menu + hover/prompt/interact/placement/destroy;
  fuel-deducting `processAmount`; `spawnBadlandsMinerals()`; `requiresWorkbenchTier` enforcement;
  `heavy_armor` magic/fire mitigation in `applyDamageToPlayer`; extend `applyTierVisual` to swap bench
  textures; per-run field resets in `create()`.
- `src/systems/Items.ts` / `Inventory.ts` — new resources, ingots, `gremlin_king_heart`, `smelter`,
  6 base armor, 3 base weapons; update King-drop description.
- `src/systems/Recipes.ts` — Smelter, 6 armor, 3 weapon recipes; new `requiresWorkbenchTier` field.
- `src/systems/StationUpgrades.ts` — "Ember Crucible" (smelter) + "Forge Anvil" (workbench Lvl 3).
- `src/systems/Weapons.ts` — extend `WeaponType` + all per-weapon tables.
- `src/systems/Skills.ts` — `heavyArmorMagicMitigation()` + updated impact text.
- `src/entities/GremlinKing.ts` — heart drop.
- `src/scenes/BootScene.ts` — textures: smelter (2 tiers) + icon, workbench Lvl 2/3 art, clay/ore nodes
  + icons, 2 ingot icons, King's Heart icon, 6 armor icons, 3 weapon icons + equipped visuals.
- Verify `cragscale_plate` / `duskrunner_pelt` drop from **normal** enemies (not elite-only) so the
  sets aren't over-gated; adjust loot or recipe if needed.
- `RECIPES.md` (manual) + dashboard auto-updates from the live modules.

## Verification (Session 1, project loop)

1. `node node_modules/typescript/bin/tsc --noEmit` (the `Record<WeaponType,…>` tables catch missed
   weapon entries).
2. `preview_start` ("dev") → `preview_screenshot` (`preview_resize` if the loop looks paused).
3. `preview_eval` against `MainScene`:
   - **Mining:** `spawnBadlandsMinerals` clay/ore counts all in the badlands, none in the forest disc/
     POI clear-radii; Stone Pickaxe mines them.
   - **Smelter:** build from clay+stone (Workbench-gated); load Sunscorch Ore, confirm smelt gated on
     Hex Essence fuel (short → blocked; enough → Sunsteel Ingot at 2:1, fuel consumed); rare ore
     rejected until the Smelter is upgraded.
   - **King gate:** rare-ore smelting blocked; grant a Heart, apply the Ember Crucible upgrade, confirm
     Cinderforged Ore now smelts to Embersteel Ingot; confirm the Heart was consumed.
   - **Workbench gate:** base forged recipes blocked until a Forge-Anvil (Lvl 3) Workbench is nearby;
     confirm the live "Requires Workbench Lvl 3" line; upgrade → craftable.
   - **Gear:** craft each armor piece + weapon; equip a Sunsteel piece → `heavy_armor` XP accrues on a
     kill + defense total correct; take a Hexling `magic` bolt / Cinder `fire` in heavy vs light and
     confirm heavy mitigates; warhammer sweeps a cluster (arc); sword/pike route XP to slash/pierce.
   - **Bench look:** upgrading Workbench/Smelter swaps the texture per tier and survives Destroy→
     replace.
4. `preview_console_logs` (level error).

## Deferred beyond Phase 4 (call out, don't silently drop)

Forged **tool** tier (pickaxe/axe) + hard-node tool-gating; a forged **ranged** weapon; Gloam→Ember-
Shard conversion (Phase-5 relic currency). Phase 5 (tier-2 relics, biome-1 relic trim,
family-replace-with-refund) is separate and later.
