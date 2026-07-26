# Station-Upgrade Rework + Campfire Lvl 3/4 + Cross-Biome Cooking + Cooking-Menu Rework

## Context

Cooking tops out at a **Lvl 2 campfire** with 4 forest-only, plain-HP-regen dishes, while the badlands
drops five raw food ingredients (`duskrunner_meat`, `emberbloom`, `sunfruit`, `gloamcap`, `dustbloom`)
with **no recipes**. The user wants higher campfire tiers, cross-biome dishes, and a cooking-menu rework —
but designing this surfaced that the whole **station-upgrade model is wrong** and must be fixed first.

### The upgrade model must change (the user, locked)

Today each `StationUpgradeDef` has a hardcoded `resultTier`; the shared Upgrade panel offers only the
upgrade whose `resultTier === currentTier + 1` and **locks the rest** ("Requires previous tier") — a
**strict ladder**. The user wants that gone:

- **No ladder.** Any *discovered* upgrade for a station shows in the Upgrade menu immediately, regardless
  of the station's current level. A Lvl 1 Workbench carried into the badlands can take the badlands
  upgrade straight away.
- **Apply = current level + 1.** Applying an upgrade never jumps to a baked-in level — it bumps the
  station's level by exactly one, from wherever it is.
- **Level = count of upgrades applied** (any order). `requiredCampfireTier`/`requiresWorkbenchTier`
  gate on that count. Material-specific gating is provided by **recipe/ingredient discovery** (you had
  to discover sunsteel/embersteel to even have a forged-gear recipe), NOT by which upgrade was applied —
  so "any 2 upgrades → forged-gear level, *if* you've discovered the recipe" is intended and fine.
- **Scope: stations + processors only** (Workbench, Campfire, Smelter, Relic Forge, + any future placed
  processor). Worn **weapon/armor upgrades keep their existing ladder/`resultTier` behavior** — out of
  scope, untouched.

Because a station can't re-apply the same upgrade and its level is capped at its number of *defined*
upgrades, the expensive top upgrade (e.g. Embersteel) is still required to reach max level.

### Other locked decisions
- **Campfire Lvl 3/4 reuse the ingot economy** (Sunsteel then Embersteel, "same principle as the
  Workbench") but with **distinct quantities** so they don't read as reskinned Workbench costs. They're
  now just two more (non-ladder) upgrade steps in the campfire's set.
- **New dishes are HP-regen only, upped numbers** — no `Buffs.ts` changes. "Flexible/different" = new
  cross-biome ingredients/costs, not new effect types.
- **Cooking menu: collapsible sections by campfire tier, descending** (best on top), scrollable, only
  showing currently-unlocked tiers; plus a way to see which sections have cookable-now recipes.

`CookRecipe` **already has `requiredCampfireTier`** and `CookingMenu.render()` already filters by it; the
per-instance level is already stored via `.setData("tier", …)`. So the cooking *data* is cheap once the
upgrade model is fixed.

**Model:** Opus (upgrade-system behavior change + new campfire tier + new content + first scrollable menu).

---

## Part 0 — Station/processor upgrade model: no ladder, apply = +1, level = count

The load-bearing change; everything else builds on it. **Weapon/armor upgrade behavior must stay
unchanged** (the Upgrade panel is shared), so the new model is driven off a per-target "applied set" that
only stations/processors provide.

### Per-instance applied-upgrade set (new state)
A placed station instance must remember **which** upgrade ids it has applied (to drive the menu, prevent
re-applying the same one, and cost-gate correctly), with **level = set size**.
- **Placed object:** alongside the existing `image.setData("tier", …)`, store the applied ids, e.g.
  `image.setData("upgrades", string[])`. `tier` stays as the numeric level = `upgrades.length` (keeps
  every existing `getData("tier")` reader — `requiredCampfireTier` checks, `isNearWorkbenchAtTier`,
  `applyTierVisual`, `discoverCookRecipes`, `stationDisplayName` — working unchanged).
- **Destroy → pickup → re-place persistence:** the current code carries `tier` on `ItemStack.tier`.
  Extend that to also carry the id list (`ItemStack.upgrades?: string[]`), and restore both on re-place
  (the `key === "campfire"` / placement block near `MainScene.ts:6280`/`:6306`). Without the id list a
  re-placed station couldn't know which upgrades remain, letting a player spam the cheapest upgrade to
  max a station — so the id list, not just the count, must survive.

### Apply path (`MainScene.ts`, ~6640–6690)
Replace the hardcoded-destination write. Instead of `obj.setData("tier", upg.resultTier)`:
- Append `upg.id` to the instance's `upgrades` set (guard against dupes), set
  `tier = upgrades.length`, `applyTierVisual(obj, tier)`, and for campfire `discoverCookRecipes(tier)`.
- `stationDisplayName(itemKey, tier)` already renders `Lvl tier+1` — unchanged.

### `StationUpgradeDef` + `upgradesForItem` (`src/systems/StationUpgrades.ts`)
- `resultTier` **loses its "destination level" meaning.** Keep the field only as a **display/sort order
  hint** (rename intent in a comment; or replace `resultTier` with an explicit `order` and sort by it) so
  the menu lists cheaper/earlier upgrades first. It no longer drives applied level or gating.
- Campfire Lvl 3/4 (Part 1) are simply two more entries in the campfire's set.

### Shared Upgrade panel (`src/ui/UpgradeMenu.ts`, render/renderUpgradeRow ~152–229)
Branch on whether the target is a station/processor (provides an applied-set) vs a worn weapon/armor
(does not):
- **Station/processor:** available upgrades = `upgradesFor(itemKey)` filtered to **discovered** AND
  **id ∉ appliedSet**. **Remove the ladder lock** (`locked = resultTier > target.tier + 1`) and the
  `resultTier > target.tier` filter. Every listed upgrade is applyable if affordable + not blocked by an
  `extraBlockReason` (e.g. Workbench-proximity for a tier-gated upgrade). Its shown "level" is irrelevant
  now — label the effect (`deltaLabel`/description), not a destination tier.
- **Weapon/armor:** keep the existing `resultTier`/ladder path verbatim.
- Thread this via a new optional dep, e.g. `appliedUpgradeIds(target): Set<string> | null` — non-null for
  stations (from the placed instance's `upgrades` data / worn... n/a), null for weapon/armor → old path.

### Discovery (`canDiscoverUpgrade` / `MainScene.ts:7016`, `UpgradeMenu.ts:166,179`)
"Discovered" (all cost ingredients known) stays the gate that surfaces an upgrade — this is now the
*primary* gate (with no-ladder, discovery is what enables a badlands upgrade to appear on a low station).
Confirm the `resultTier > eq.tier` predicate at `MainScene.ts:7016` (used to decide whether a placed
station has *any* offerable upgrade for its right-click affordance) is replaced with the
"discovered ∧ not-applied" test for stations.

### Dashboard (`src/dashboard/main.ts:381/439/461/680`)
Those render `Lvl ${u.resultTier + 1}` per upgrade. Since a station upgrade no longer maps to a fixed
level, change the station-upgrade rows to list the upgrade by name/cost/effect **without a fixed "Lvl N"
tag** (or show it as a cost-tier hint). Leave the armor/weapon upgrade tables (which keep `resultTier`)
as-is.

---

## Part 1 — Campfire Lvl 3 & Lvl 4 upgrades (`src/systems/StationUpgrades.ts`)

Two more (non-ladder) campfire upgrades → campfire now has 3 total (Stone Hearth + these), so max level =
4. Costs reuse ingots with distinct amounts (`sunsteel_ingot`/`embersteel_ingot`/`clay`/`stone` confirmed
from Phase 4a); `deltaLabel` describes the *effect*, not a destination level. Numbers tunable:

```ts
{
  id: "sunsteel_grill",
  name: "Sunsteel Grill",
  description: "A forged grill plate over the coals. Sears badlands game and desert flora.",
  appliesToItemKey: "campfire",
  resultTier: 2,                      // sort/display order only — NOT the applied level
  costs: { sunsteel_ingot: 3, clay: 8, stone: 10 },
  deltaLabel: "Better campfire dishes",
},
{
  id: "emberforge_hearth",
  name: "Emberforge Hearth",
  description: "An ember-fed hearth that never dies down. Cooks the richest cross-biome feasts.",
  appliesToItemKey: "campfire",
  resultTier: 3,                      // sort/display order only
  costs: { embersteel_ingot: 3, stone: 20 },
  deltaLabel: "Best campfire dishes",
},
```

Existing `stone_hearth` `deltaLabel` "Unlocks Lvl 2 dishes" → reword to effect-based ("Better campfire
dishes") for consistency (level isn't the upgrade's identity anymore).

**Visual per tier:** extend `MainScene.applyTierVisual` to give campfire levels **3 and 4** a distinct
tell (texture swap if `campfire_t2`/`campfire_t3` baked, else a tint step — match Workbench/Smelter). Add
placeholder textures in `BootScene.ts` if going the texture route.

---

## Part 2 — New dishes: biome-native best + leftover-burning mixed (`Cooking.ts`, `Items.ts`, `BootScene.ts`)

**Design rule (the user, locked):** each tier gets a **biome-native "best" dish** craftable **entirely from
current-biome ingredients** (+ universal prep like `shishkabob`, which is just wood) — so a player deep in
the badlands **never has to backtrack to the forest to farm food**. Alongside it, **optional mixed dishes**
let you spend *plentiful leftovers* from an earlier biome — but they use only a common leftover as a MINOR
component (`boar_meat`, the most abundant forest food drop), never a niche forest mat that would force a
farm trip, and they're never the *only* good option at their tier. (The existing Lvl1/Lvl2 forest dishes
already are the forest's native best — this just extends the pattern to the badlands tiers.)

Add ~5 `CookRecipe` entries. Existing: Lvl1 +2 HP/s·20s, Lvl2 +3 HP/s·30s. New tiers stay a gentle ramp
(the user: "not way better"): **Lvl 3 ≈ +4 HP/s·32s**, **Lvl 4 ≈ +5 HP/s·40s**. `requiredCampfireTier` is
the level *count* (2 = Lvl 3 campfire, 3 = Lvl 4). Each output = a new `edible` ItemDef + a BootScene icon.

**Tier 2 (`requiredCampfireTier: 2`, Lvl 3 campfire):**
| id / output | inputs | type | edible |
|---|---|---|---|
| `seared_duskrunner_steak` | shishkabob 1, duskrunner_meat 1, dustbloom 1 | badlands-native best | +4 HP/s, 32s |
| `emberbloom_broth` | emberbloom 2, sunfruit 1, gloamcap 1 | badlands-native (meatless) | +3.5 HP/s, 42s |
| `sunfruit_glazed_ribs` | shishkabob 1, sunfruit 2, boar_meat 1 | mixed — leftover boar_meat | +4 HP/s, 32s |

**Tier 3 (`requiredCampfireTier: 3`, Lvl 4 campfire):**
| id / output | inputs | type | edible |
|---|---|---|---|
| `sunscorch_feast` | shishkabob 1, duskrunner_meat 2, gloamcap 1, sunfruit 1 | badlands-native best | +5 HP/s, 40s |
| `emberglazed_skewer` | shishkabob 1, duskrunner_meat 1, emberbloom 1, boar_meat 1 | mixed — leftover boar_meat | +5 HP/s, 36s |

Both tiers' **best** dish (`seared_duskrunner_steak`, `sunscorch_feast`) and the meatless broth are 100%
badlands-native. The two mixed dishes are optional alternates keyed on `boar_meat` only. Because they're
`COOK_RECIPES` outputs they're auto-excluded from the blue "material discovered" toast and get the
recipe-unlock toast via the existing `announceCookRecipes` path (gates on ingredients-discovered) — no
`CRAFTED_OUTPUT_KEYS` edit. Ingredients/numbers tunable in playtest.

---

## Part 3 — Cooking menu rework (`src/ui/CookingMenu.ts` + one guard in `MainScene.ts`)

Rework the flat list into **collapsible tier sections (descending) + a scrollable list region**, keeping
the fixed intro header and fixed footer (detail + slider + Cook button + ProgressBar) outside the scroll
region. Full design in `zany-whistling-flurry-agent-ab5b0ce413e6d9a8a.md`. Load-bearing points:

**Windowed rendering (not a moving Container).** Per the Container+scrollFactor(0) input bug, and because
a Phaser **geometry mask clips rendering only, NOT input**:
1. Compute grouped layout in content-space (headers always counted; rows only for non-collapsed tiers) →
   `contentH`, then `maxScroll = max(0, contentH - viewH)`, clamp `scrollOffset`.
2. **Only create GameObjects for rows/headers intersecting the fixed viewport** — off-window rows never
   exist, so no phantom hit areas.
3. A rectangular geometry mask over the viewport (created once in ctor, `scrollFactor(0)`, kept out of the
   per-render `rows`) purely clips the one partially-visible row at each edge.

**New fields/methods:** `scrollOffset`, `collapsedTiers: Set<number>`, `maxScroll`, `maskShape`/`listMask`,
`groupedVisibleRecipes()` (existing predicate → group by `requiredCampfireTier` → tiers DESC, each tier's
recipes by total heal `hpPerSec×durationMs` DESC), `renderSectionHeader(group, screenY)` (box + label +
collapse chevron; pointerdown toggles `collapsedTiers` then re-renders). Panel becomes **fixed height**,
centered once. `renderRow` takes a pre-offset `screenY` and applies `listMask` to each object it creates.

**Wheel wiring (two-sided, mirrors `EventLogUI`):** CookingMenu registers its own
`scene.input.on("wheel", …)` guarded by `!open || !containsPoint`, adjusting `scrollOffset` and
re-rendering. In `MainScene`'s global wheel handler (~1185) add:
`if (this.cookingMenu.isOpen() && this.cookingMenu.containsPoint(p.x, p.y)) return;` so the hotbar doesn't
cycle while scrolling the menu.

**On open:** reset `scrollOffset = 0`, `collapsedTiers` empty. `maskShape`/`listMask`/`bg`/`progressBar`
persist across `close()`. Never `setMask` the ProgressBar or tooltip.

**Invariant to comment:** off-window rows must never be created — the mask does not clip input, so
"render all + mask" would reintroduce phantom clicks.

### Cookable-now indicators + filter (the user's ask)
Reuse the existing affordability primitive `canAffordCook(recipe, backpack)` (`Cooking.ts`), mirroring how
`CraftingMenu` uses `isCraftable`. **Use the existing amber accent `#ffe08a`, NOT green** (reserve
red/green for buff/debuff deltas — "you can cook this" is not a buff delta).
- **Collapsed-section badge:** each section header shows an amber `● N` badge when N (its recipes passing
  `canAffordCook` + room) > 0 — so a *collapsed* Lvl 4 section still says "3 here you can make." Shown
  expanded too. N reflects the unfiltered cookable count regardless of collapse.
- **"Show only cookable" filter:** a checkbox in the fixed intro header; new `onlyCookable: boolean`
  (persists across opens within a run; resets on `scene.restart`). When on, `groupedVisibleRecipes()`
  additionally filters to `canAffordCook`, drops empty tiers, re-clamps scroll.

### Matching indicator on `CraftingMenu` category tabs (`src/ui/CraftingMenu.ts`)
the user's wording ("collapsed crafting windows tabs") also points at the crafting menu, whose category
**tabs** (`CATEGORIES`, drawn at `tabY`) hide recipes until selected. Draw a small **amber dot** next to a
tab's label when that category has ≥1 recipe passing the existing `isCraftable(deps, recipe)`. Reuses
`isCraftable` verbatim; dot only, no filter.

---

## Part 4 — Docs

Update `RECIPES.md`: cooking table (5 new dishes) + station-upgrades table (campfire Sunsteel Grill /
Emberforge Hearth; and note the no-ladder/count model in the upgrades section). `/dashboard.html` imports
live modules so recipe/cost tables auto-reflect — but its per-upgrade "Lvl N" tags need the Part 0 change.

---

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit` — clean.
2. `preview_start "dev"` → `preview_resize` (unstick render loop) → `preview_screenshot` boots.
3. `preview_eval` on `window.__game.scene.getScene('MainScene')`:
   - **No-ladder upgrade:** `window.__dev.nobuildcost()`; place a fresh (Lvl 1) Workbench; confirm the
     Upgrade menu offers **all discovered** workbench upgrades with **none locked** as "requires previous
     tier"; apply the badlands (Forge Anvil) upgrade first and confirm the bench goes **Lvl 1 → Lvl 2**
     (current+1, NOT Lvl 3), its `upgrades` set = `["forge_anvil"]`, and the same upgrade no longer
     appears. Apply another → Lvl 3; confirm a `requiresWorkbenchTier: 2` forged recipe becomes craftable
     (gate on count, given its ingredients are discovered).
   - **Persistence:** upgrade a station twice, Destroy → pick up → re-Place; confirm level AND applied-set
     survive and the already-applied upgrades aren't re-offered.
   - **Weapon/armor untouched:** confirm a worn Gremlin Cap's upgrade panel still shows its Lvl2→Lvl3
     ladder behavior unchanged.
   - **Campfire chain:** apply Stone Hearth + Sunsteel Grill + Emberforge Hearth in an arbitrary order;
     confirm level climbs 1→4 and tier-2/3 dishes appear at the right counts; `applyTierVisual` shows the
     Lvl 3/4 tell.
   - **Cooking:** cook `seared_duskrunner_steak` and `gloamcap_feast`; inputs consumed only on ProgressBar
     complete, output added, eating applies the HP-regen buff.
   - **Menu rework:** many recipes across tiers → (a) sections descending by tier, (b) header click
     toggles collapse + re-clamps scroll, (c) wheel scrolls the list while footer/Cook button stay put,
     (d) hotbar does NOT cycle while scrolling, (e) mask clips cleanly after moving the camera far from
     origin (else switch mask rect to world-space per agent plan risk #1), (f) a scrolled-out row can't be
     clicked (no phantom hit).
   - **Cookable indicators:** with ingredients for only some dishes, a collapsed section shows amber `● N`
     with correct N; "Show only cookable" hides non-affordable dishes + empty tiers; crafting tabs show an
     amber dot on categories with a currently-`isCraftable` recipe.
4. `preview_console_logs` level `error` — clean.

## Critical files
- `src/systems/StationUpgrades.ts` — `resultTier` demoted to sort hint; +2 campfire upgrades.
- `src/ui/UpgradeMenu.ts` — no-ladder/count path for stations via an applied-set dep; weapon/armor path kept.
- `src/scenes/MainScene.ts` — apply path (append id, tier=count), placed-object `upgrades` data,
  ItemStack persistence, `applyTierVisual` campfire 3/4, offerable-upgrade test, global-wheel guard.
- `src/systems/Cooking.ts` — +5 `CookRecipe` (reuse `canAffordCook`).
- `src/systems/Items.ts` — +5 edible output ItemDefs (+ `ItemStack.upgrades?: string[]` if ItemStack lives here).
- `src/scenes/BootScene.ts` — +5 food icons (+ optional campfire tier textures).
- `src/ui/CookingMenu.ts` — collapsible/scrollable rework + cookable badges + "Show only cookable" filter.
- `src/ui/CraftingMenu.ts` — amber "has-craftable-now" dot on category tabs.
- `src/dashboard/main.ts` — station-upgrade rows drop the fixed "Lvl N" tag.
- `RECIPES.md` — cooking + station-upgrade tables + no-ladder note.
