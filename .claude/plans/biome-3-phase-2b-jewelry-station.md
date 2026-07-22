# Biome-3 Phase 2b — Equipment passive pipeline + dedicated jewelry station (dormant)

## Context

Phase 2a shipped the Q/E/R activated-ability framework with the 3 ability "special" items dev-only.
Phase 2b makes the jewelry/gem economy real — but **the user scoped gems + jewelry crafting as biome-3+
content**: gems are not findable before biome 3, and crafting happens at a **dedicated new station**
whose ability tier is gated behind a **Duneshaper boss drop** — mirroring the Gremlin King's Heart →
Smelter (Ember Crucible) pattern. Since the bayou (biome 3) has no world content yet, this session
builds the **biome-agnostic passive-effect pipeline live**, and **authors the full station + jewelry/gem
data as dormant, biome-3-gated content** (placeable + menu functional, testable via `__dev.give`; real
gem/metal/Duneshaper sources land in the biome-3 phases). Mirrors 2a (abilities dev-only) + Phase 1
(dormant hooks).

**Why the Duneshaper gate is dormant-but-consistent:** killing the Duneshaper currently ends the run
(`MainScene.ts:6704-6709`), so its drop is unreachable today. Per the roadmap, biome 3's boss becomes
the win-con and **demotes the Duneshaper to a mid-progression big boss** (kill continues the run) — at
which point the drop, and this jewelry upgrade, become legitimately reachable. Authored now; wired-to-win
later.

**Locked decisions:** gems consumed in recipes (no sockets); rings/amulet passive-only (no T slot);
jewelry via a **dedicated station** (its own recipe-list menu, cloned from Cooking/Campfire — NOT the
Workbench/`Recipes.ts` path); **base station = passive jewelry, Duneshaper-drop upgrade = ability
specials**; **jewelry identity = ability-augments + utility/explorer, NOT raw-% combat stats** (relics
already own the raw-stat layer — jewelry must feel distinct); test via `__dev.give`. Model: **Opus**
(new effect system + new station + boss-gate). Large session.

---

## A. LIVE this session (biome-agnostic)

### A1. Jewelry-effect pipeline — NEW `src/systems/EquipmentEffects.ts` + `ItemDef.passive`
The core new system (equipped non-armor items have **no** mechanical effect path — `ItemDef.stats` is
display-only). Same summer *shape* as `Relics.ts` getters, but **distinct channels** so jewelry never
duplicates relics — two identities: **ability-augment** + **utility/explorer**.
- `ItemDef.passive?: EquipPassive` (`Items.ts:18-44`) — optional additive record, channels:
  - *Ability-augment:* `abilityCooldownPct` (reduce all Q/E/R cooldowns), `abilityPowerPct` (scale ability
    effect magnitudes — nova dmg/radius, blink distance, bloodpact siphon %).
  - *Utility/explorer:* `magnetRadiusPct`, `gatherBonusPct` (chance for +1 on a depleted node),
    `lightRadiusPct` (bigger night/torch light).
  - Type in `EquipmentEffects.ts`, `import type`d into `Items.ts` (no runtime cycle).
- `EquipmentEffects` class: `recompute(equipment)` sums `passive` over every equipped slot; getters:
  `abilityCooldownMult()` (= `1 - sum/100`, **clamped to min 0.4** so CDR can't zero a cooldown),
  `abilityPowerMult()`, `magnetRadiusMult()`, `gatherBonusChance()`, `lightRadiusMult()`.
- **MainScene wiring:** `this.equipEffects` field; `recompute` in `afterItemMove()` (`:2558`, beside
  `recomputeAbilities()`); fresh instance in `create()` (scene.restart field-init gotcha).
- **Hook sites (bespoke, one edit each — NOT the relic combat hooks):**
  - `abilityCooldownMult` → `tryCastAbility` cooldown set (`:6552`, `now + def.cooldownMs * mult`) **and**
    `abilityEntries()` (`:6529`) so the HUD sweep matches the reduced cooldown.
  - `abilityPowerMult` → inside `castBlink`/`castNova`/`castBloodpact` (scale distance / dmg+radius / %).
  - `magnetRadiusMult` → the auto-pickup/magnet radius site; `gatherBonusChance` → the depleted-node
    bonus-drop site (already has the M-SS chopping/mining bonus-drop roll — add the jewelry chance);
    `lightRadiusMult` → `equippedLightRadius`/`collectLights` night-light radius. (Grep each; single edits.)
- `Tooltip.ts` — passive lines derived from the `passive` record (no drift), e.g. "-15% ability cooldown".
- Note: no `syncStatBonuses` change needed (no HP/stamina/combat-stat channels — that's deliberately relics' turf).

### A2. Ring-slot equip resolution — `MainScene.equipArmorFromContainer` (`:8860`)
A ring `armorSlot:"ring1"` currently only fills ring1. Special-case: a ring target equips into the
**first empty of ring1/ring2** (fall back to swapping ring1 if both full). Amulet → `necklace` (single).

---

## B. Dedicated jewelry station — built now, functional, recipes dormant behind gems/tier
Clone the **Campfire+Cooking** pattern (dedicated station, own multi-ingredient recipe-list menu, gated
by the station's own upgrade tier — the agent confirmed Cooking.ts was literally built to be split into a
station like this).

### B1. New placeable station `jewelry_station` ("Gemwright's Table", working name)
- `Items.ts` ItemDef (`placeable:true, maxStack:1, hotbarable:true`, station stats) — pattern: smelter
  `:742`. `Recipes.ts` recipe to craft the station itself (tier 1, Workbench-gated; **costs include
  `moonsilver`** so it's biome-3 content — pattern: smelter `:201`). `BootScene.ts` texture.
- Placement per-key hook (`MainScene.ts:8090-8110`): a `jewelry_station` branch (discover jewelry recipes /
  init per-instance state). Hover/prompt/interact: add key to the placed-station loop filter (`:5727`),
  `hoveredJewelry` field + branch (mirror `:5732`), `promptForJewelry` → `"[LMB] Craft"` (mirror `:5959`),
  `tryInteract` branch opening the menu (mirror `:6040`). `applyTierVisual` tint is free (no per-tier art).

### B2. `src/systems/Jewelry.ts` (mirror `Cooking.ts`)
- `JewelryRecipe { id, name, output, inputs: Record<string,number>, requiredStationTier }` + `JEWELRY_RECIPES`
  + `canAffordJewelry`. **Two tiers:**
  - **`requiredStationTier: 0`** (base station) — passive jewelry: `ring_quickening`, `amulet_channeling`,
    `ring_forager`, `amulet_farsight` (costs = moonsilver + a common material).
  - **`requiredStationTier: 1`** (needs the Duneshaper-drop upgrade) — the ability specials
    `special_gloamstep_band` / `special_gloam_focus` / `back_bloodpact_shroud` (costs = moonsilver + the
    specific gem, existing 2a items, unchanged).

### B3. `src/ui/JewelryMenu.ts` (clone `CookingMenu.ts`)
Recipe-list menu, tier filter (`requiredStationTier <= tier` + all inputs discovered), craftable/greyed
per `canAffordJewelry || noBuildCost`, ProgressBar commit (~500ms). Dep seam: `jewelryStationTier()`,
`craft(id, batches)`. MainScene: `createJewelryMenu`/`openJewelryMenu`/`closeJewelryMenu`/`craftAtJewelry`/
`maxJewelryBatches` mirroring the campfire methods; deposits output to backpack.

### B4. Duneshaper-drop station upgrade — `StationUpgrades.ts`
One `StationUpgradeDef` (`appliesToItemKey:"jewelry_station"`, `resultTier:1`,
`costs:{ duneshaper_heart: 1, moonsilver: N }`, `deltaLabel:"Craft ability jewelry"`). The boss drop in
`costs` auto-gates discovery (won't appear until owned). Applying it → station tier 1 → unlocks the
ability-special recipes. Reuses the generic right-click Upgrade/Pick-up popup + `applyStationUpgrade`
verbatim; add a `jewelry_station` branch there if a discover-recipes call is needed (mirror the campfire's
`discoverCookRecipes`).

### B5. New Duneshaper unique drop — `duneshaper_heart` ("Duneshaper's Heart")
Mirror `gremlin_king_heart`: `Items.ts` ItemDef (non-hotbarable) + `BootScene.ts` icon + append to
`Duneshaper.ts:184-187` loot. Dormant/unreachable until biome 3 demotes the Duneshaper (documented).

---

## C. Materials + jewelry items — authored dormant (no live source this session)
- `Inventory.ts` ResourceType + `Items.ts` defs + `BootScene.ts` icons for **`moonsilver`** (jewelry
  metal) + **`gem_gloam` / `gem_ember` / `gem_blood`** (each gem gates one ability special — "gem source
  dictates build"). Gem icons via the `relicGem(key,base,light)` helper (`BootScene.ts:1804`).
- 4 passive jewelry ItemDefs (`passive` records + `armorSlot` ring/necklace + icons), **ability-augment +
  explorer identities** (no combat-stat overlap with relics). Numbers first-pass/tunable:
  - `ring_quickening` (ring) — `abilityCooldownPct: 15` (Q/E/R recharge faster).
  - `amulet_channeling` (necklace) — `abilityPowerPct: 20` (abilities hit harder/farther).
  - `ring_forager` (ring) — `gatherBonusPct: 15` + `magnetRadiusPct: 30` (explorer).
  - `amulet_farsight` (necklace) — `lightRadiusPct: 40` + `magnetRadiusPct: 20` (explorer).
- **No node, no drops** — all sourcing deferred to biome 3.

## D. Explicitly DEFERRED to the biome-3 content phases (3/4)
Gem drops from bayou enemies/minibosses/boss; the moonsilver mine node; the epic-loot chest pool (found
specials/gems); and wiring the Duneshaper kill to continue-the-run (its demotion) so the heart is
legitimately obtainable. Marked with `// biome-3` comments at each dormant seam.

---

## Critical files
- **New:** `src/systems/EquipmentEffects.ts`, `src/systems/Jewelry.ts`, `src/ui/JewelryMenu.ts`.
- `src/systems/Items.ts` (`passive` field; station + heart + 4 materials + 4 jewelry defs),
  `src/systems/Inventory.ts` (ResourceType), `src/scenes/BootScene.ts` (icons/station texture),
  `src/systems/Recipes.ts` (station-craft recipe only), `src/systems/StationUpgrades.ts` (heart-gated
  upgrade), `src/ui/Tooltip.ts` (passive lines), `src/entities/Duneshaper.ts` (heart drop).
- `src/scenes/MainScene.ts` — `equipEffects` field/recompute/reset + ~8 relic-parallel hook edits +
  `syncStatBonuses` terms + ring-slot resolution; jewelry-station field/create/open/close/craft/maxBatches,
  placement per-key hook, hover/prompt/interact branch.
- Docs: `RECIPES.md` (station recipe + a new Jewelry-station recipe section, mark "biome-3"), `STATUS.md`,
  dashboard (recipes live; note the Duneshaper heart on the Enemies loot row), biome-3 memory.

## Reuse (don't reinvent)
- `Relics.ts` getters → `EquipmentEffects`; `Cooking.ts`+`CookingMenu.ts`+the campfire station wiring →
  `Jewelry.ts`+`JewelryMenu.ts`+the jewelry-station methods (near-exact clone); `StationUpgrades` +
  `applyStationUpgrade` + the generic Upgrade/Pick-up ContextMenu; `gremlin_king_heart`/Ember-Crucible →
  `duneshaper_heart`/the jewelry upgrade; `relicGem` texture helper; the 3 unused equip slots; the
  existing 2a `grantsAbility` specials (2b adds recipes only).

## Verification (live, per the biome-3 workflow — all via `__dev.give`)
1. `node node_modules/typescript/bin/tsc --noEmit`.
2. `preview_start` (`"dev"`) → `preview_screenshot`; `preview_resize` if the loop is paused.
3. `preview_eval` against `MainScene`:
   - **Jewelry pipeline:** `__dev.give("ring_quickening"); __dev.give("ring_forager")` → equip both →
     assert two-ring resolution (ring1+ring2 filled). Equip an ability special + `ring_quickening`, cast Q,
     and assert `abilityReadyAt` reflects the reduced cooldown (and the HUD sweep matches); equip
     `amulet_channeling` and assert `castNova` damage/radius scaled up. Equip `ring_forager`/`amulet_farsight`
     → assert `magnetRadiusMult`/`lightRadiusMult` > 1. Unequip all → getters back to 1/0.
   - **Station:** `__dev.give("jewelry_station")` → place → click → JewelryMenu opens; assert the 4
     passive recipes are visible (tier 0) and the 3 ability-special recipes are **hidden** (need tier 1);
     `__dev.give` the inputs → craft a passive ring, confirm it lands in the backpack + equips.
   - **Boss upgrade:** `__dev.give("duneshaper_heart"); __dev.give("moonsilver",N)` → right-click the
     station → apply the upgrade → tier→1 → assert the 3 ability-special recipes now appear; craft
     `special_gloamstep_band` → equip → confirm it lights the Q bar (unchanged 2a path).
4. `preview_console_logs` level `error` — clean.
