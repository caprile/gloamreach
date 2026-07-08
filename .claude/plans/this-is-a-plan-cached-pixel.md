# Plan: Roadmap/plan update — Drying Rack polish, station upgrades, Gremlin armor set

**This is a planning-doc update only — no code changes this session.** The deliverable is:
1. A new milestone plan file committed to `.claude/plans/` (this content, once finalized).
2. Edits to `CLAUDE.md`'s Roadmap / "First biome — content notes" sections to point at it and
   record the new locked decisions below.

## Context

Playtest feedback surfaced a batch of follow-ups spanning the Drying Rack, placement mode,
placed-object upgrades, and a brand-new Gremlin armor set — the first time armor will actually
become wearable (`src/systems/Equipment.ts`'s slot system has existed since Milestone H but
nothing has ever called `equipment.set()`). This is too large for one session, so it's split
into milestones (I–O, continuing the A–H lettering from the first-biome plan) following this
project's "one milestone per chat session" convention. Confirmed with the user before writing
this plan:

- **Crafting-menu tab reorg**: Workbench, Campfire, and Drying Rack all move into the
  **Crafting** tab (campfire is conceptually a processor too, per the user). Shishkabob moves
  to **Misc**. No new "Stations"/"Processors" tabs — simpler than originally proposed.
- **Station-upgrade popup** (the right-click "Upgrade" menu) only lists upgrades whose
  ingredients have all been discovered at least once — mirrors the existing tier-1
  recipe-discovery gating, not "show everything greyed out."
- **Armor equip**: both **drag onto the paper-doll slot** and **right-click to auto-equip**
  should work, matching the existing hotbar right-click-to-quick-move precedent.

Research already done this session (file:line references below come from three Explore passes
over `Items.ts`/`Recipes.ts`/`Inventory.ts`, `Processing.ts`/`DryingRackMenu.ts`/
`ResourceNode.ts`/placement flow, and `Enemy.ts`/hotbar/right-click flow) — no further
exploration should be needed before implementation.

---

## Milestone I — Drying Rack polish (slider, description, recipe, tab) — SHIPPED 2026-07-08

**Goal:** small, independent fixes bundled because they all touch `DryingRackMenu.ts`/
`Processing.ts`/`Items.ts`/`Recipes.ts` in one pass.

**Shipped as planned, no deviations.** `ProcessingStation` gained `recipeForLoaded()` and
`maxPossibleOutput()` (`Processing.ts`); `DryingRackMenu`'s `selectedAmount` now represents
desired **output** count (0..`maxPossibleOutput()`) everywhere it's read/written (open,
`selectFullAmount`, slider drag, numeric prompt, render clamp) — the only place input units
reappear is the `previewFor`/`process`/`deps.processAmount` call boundary in `renderProcess()`,
which multiplies by `recipe.inputPerOutput` right before calling out, per the plan's "call-site
conversion only" note. Cattail's description trimmed to "A reed harvested from the creek's
edge." (no more "dried into twine" spoiler). Drying Rack recipe → `wood: 5, leather: 4, bones: 2`.
Tab reorg: `campfire` `misc`→`crafting`, `shishkabob` `crafting`→`misc`, `drying_rack`
`misc`→`crafting` (`workbench` was already `crafting`, no change needed there).

- **Slider → output-amount based, auto-scaled.** Today `DryingRackMenu.ts`'s `selectedAmount`
  (line 76) is an **input-unit** count (0..`station.maxProcessable()`, `Processing.ts:68-70`);
  `updateSliderFromPointer()` (194-200) and `renderProcess()`'s frac/max (306-343) all key off
  input units, with `previewFor(amount)` (`Processing.ts:76-83`) converting to output count only
  for the label. Rework so the slider **represents desired output count**, scaled 0..max
  possible output (e.g. 20 cattail at 2:1 → slider shows 0..10, not 0..20): add a
  `maxPossibleOutput()` on `ProcessingStation` (`Math.floor(input.count / recipe.inputPerOutput)`),
  point the slider's frac/max and `updateSliderFromPointer`/`promptForAmount`
  (`DryingRackMenu.ts:389-398`) at it, and convert output-count → input-units
  (`outputAmount * inputPerOutput`) only at the `previewFor`/`process` call sites. No change to
  `Processing.ts`'s core `previewFor`/`process` signatures needed — call-site conversion only.
- **Cattail description shouldn't spoil processing.** `Items.ts`'s `cattail` entry currently
  describes what it turns into / how to process it — trim to a plain flavor description (no
  "turns into Twine" language), matching how other raw pickups (branch, rock) are described.
- **Drying Rack recipe → `wood: 5, leather: 4, bones: 2`** (was `wood: 8, leather: 1`,
  `Recipes.ts:` drying_rack entry) — bones is a **new resource**, see Milestone N below; this
  recipe change is blocked on N shipping `bones` first (or land in the same session).
- **Tab reorg**: `Recipes.ts` — `workbench`/`campfire`/`drying_rack` → `category: "crafting"`;
  `shishkabob` → `category: "misc"`. `CraftingMenu.ts`'s tab list needs no structural change
  (categories already exist), just confirm the "Misc" tab doesn't end up empty-looking if
  shishkabob is its only occupant (it's fine, mirrors Drying Rack being Misc's sole occupant
  today).

---

## Milestone J — Placement-mode robustness + re-placing owned stations from inventory — SHIPPED 2026-07-08

**Goal:** fix the "placement mode breaks when tier-gated" bug and add a real way to re-place a
station/processor that's sitting in the backpack (e.g. recovered via Destroy).

**Shipped, with the interaction model revised twice from playtest feedback (see the two
follow-up notes at the end of this section).** `placementMode` gained an optional
`itemSource: { container, key }` tag: when set (armed from an owned stack), each placement
consumes one of that stack via `container.removeCount(key, 1)` instead of `crafting.craft()`;
running out auto-cancels. `attemptPlaceObject()`'s tier-gate branch now just logs "Requires a
nearby Workbench" and returns (ghost/mode preserved) instead of `cancelPlacement()` — walking
into range and clicking again succeeds. New `startItemPlacement(container, index)` closes open
menus, arms placement, and creates the ghost (no `suppressNextPointerdown` needed — every entry
path fires on pointerup, so there's no in-flight pointerdown to swallow). `campfire`/`workbench`/
`drying_rack` are now `hotbarable: true` so they can be moved into the hotbar in the first place.
The consume-on-success-only invariant carries over cleanly (cancelling refunds nothing because
nothing was spent).

**Final interaction model (after both revisions below):**
- **Hotbar selection drives placement, like equipping a tool.** All selection gestures route
  through one `setHotbarSelection(slot)` (number keys, scroll wheel, and left-clicking a slot,
  which now selects like the others): a selected placeable enters place mode; selecting a
  tool/weapon/empty slot exits it. Left-click-to-select is a click that releases on the same
  hotbar slot it started on (real drags to a different slot still rearrange).
- **Inventory interactions match every other item.** Right-click a backpack placeable
  **quick-moves it to the hotbar** (no special-casing); **left-click-in-place** on a backpack
  placeable **enters place mode** for it (`resolveItemDrag`'s backpack branch). Non-placeable
  click-in-place is a no-op; real drags still rearrange.

Verified via `preview_eval`: tier-gate failure keeps placement armed (count/placed unchanged)
then succeeds once a bench is nearby; two tier-0 placements deplete a 2-stack then auto-cancel;
right-click on a backpack placeable quick-moves it to the hotbar (not place mode); left-click-in-
place on a backpack placeable enters place mode (menu auto-closes, item pending place); selecting
a placeable via number/wheel/left-click enters place mode and selecting a tool/empty slot exits
it. Type-check clean, no console errors.

**Follow-up #1 (same session) — placement follows hotbar selection.** The first pass armed
placement as a one-shot on a number-key select and left wheel-cycling out. Per user feedback it
was reworked so placement mode is a *function of* the current hotbar selection (enters on a
selected placeable, exits when you select anything else — fixing a bug where switching off a
placeable mid-placement equipped the new item but stayed in place mode), and left-clicking a
hotbar slot now selects like number/wheel.

**Follow-up #2 (same session) — inventory gestures match other items.** The first pass had
*right*-click on a backpack placeable enter placement. Per user decision, right-click should
behave like every other item (quick-move to hotbar) and **left-click** should be the "enter
place mode" gesture for placeables/processors in the inventory. `startItemPlacement`'s
`suppressClick` param was dropped as part of this (no entry path needs it anymore).

- **Bug fix — don't cancel placement mode on a failed tier-gate check.**
  `attemptPlaceObject()` (`MainScene.ts:1436-1440`): today, clicking to place a tier-1 item
  (Drying Rack) while not near a Workbench calls `cancelPlacement()` — placement mode fully
  exits, forcing the player back through the crafting menu. Change: on this specific failure,
  **stay armed** (keep `placementMode` set, ghost still following the cursor) and just log/flash
  the existing "Requires a nearby Workbench" message without destroying the ghost. Placement
  should only cancel on an explicit cancel action (existing right-click-cancel / Escape, whatever
  that is today) or a successful placement.
- **Live re-check while armed.** Since placement mode now survives a failed attempt, walking into
  Workbench range afterward should let the *next* click succeed without reopening the crafting
  menu — this falls out for free once the ghost isn't destroyed, since `attemptPlaceObject()`
  re-checks `isNearWorkbench()` fresh on every click.
- **Re-enter placement mode from an inventory item.** Today `startPlacement()`
  (`MainScene.ts:1382-1388`) is only reachable from the crafting menu's "Place" button
  immediately after crafting — a placeable item sitting in the backpack (recovered via
  Destroy, per Milestone K below) has no way back into placement mode. New: **right-click a
  placeable item in the backpack/inventory menu** enters placement mode for it (consumes the
  stack the same way `attemptPlaceObject()` already does on success) — this needs a branch in
  the existing right-click handler (`InventoryMenu.ts:227` → `quickMoveItem`) that checks
  `itemDef(key)?.placeable` first and calls `startPlacement()` instead of quick-moving.
  **Also**: placeable items should become **hotbarable** (today every placeable —
  workbench/campfire/drying_rack — is hard-coded `hotbarable: false`, since they never lived in
  a container before Destroy existed); selecting a placeable item's hotbar slot
  (`recomputeEquipped()`, `MainScene.ts:456-465`) should call `startPlacement()` instead of (or
  in addition to) the current no-op tool/weapon-null behavior.
- **Open question to settle at implementation time**: what happens to the in-progress
  placement/consumed stack if the player cancels — does the item return to the same
  backpack/hotbar slot it came from? (Almost certainly yes, mirroring how crafting doesn't
  consume until actual placement succeeds today — verify `attemptPlaceObject()`'s existing
  consume-on-success-only behavior extends cleanly to this new entry path.)

---

## Milestone K — Per-instance station tiers + named upgrade system — SHIPPED 2026-07-08

**Shipped as planned, no meaningful deviations.** `ItemStack` gained an optional `tier?: number`
(`ItemContainer.ts`), additive-only — ordinary stackables never set it. Placeable ItemDefs
(`workbench`/`campfire`/`drying_rack`) dropped to `maxStack: 1` so two different-tier instances
never merge into one count (verified: a tier-0 and tier-1 Workbench occupy separate slots). New
`ItemContainer.addStack()` places a whole stack (preserving `tier`) into the first empty slot for
tiered pickups, since `add()`'s merge-by-key path would drop the metadata. `ResourceNodeConfig`/
`ResourceNode` gained a `tier?` field; `spawnLooseDrop()` takes an optional `tier` and tags the
piece; `consolidateDrop()` refuses to merge tiered pieces. A new `collectNode()` routes both the
manual-click and magnet pickup paths through `addStack` when tiered (falling back to re-dropping
the same tier if the backpack is full). `destroyPlacedObject()` reads the placed Image's `tier`
and threads it into the drop; `attemptPlaceObject()`'s item-source branch consumes the exact slot
(via new `findConsumableStack`, not `removeCount`, so it can read that slot's tier first) and
re-applies the tier + visual to the newly placed Image. New `src/systems/StationUpgrades.ts`
(`StationUpgradeDef` + `STATION_UPGRADES` + `upgradesForItem()`); first entry **Tool Sharpener**
(`workbench`, resultTier 1, `{ twine: 3, wood: 5, stone: 2 }`). The old `workbench_upgrade`
ItemDef/Recipe and its BootScene texture were removed entirely. `ContextMenu` upgrade popup
reworked (`openContextMenuForObject`): lists each matching `StationUpgradeDef` whose next step is
`tier + 1` and whose ingredients are all discovered (invisible otherwise, not greyed), showing
name + formatted cost; clicking deducts resources directly and calls the generalized
`applyStationUpgrade` → `applyTierVisual` (a shared gold-tint tell used at both the live-upgrade
and re-placement render points, so they never diverge).

**Deviation note (minor):** the visual tell is a shared gold tint (`applyTierVisual`), not a
distinct per-tier texture — the plan said "swaps texture/tint," and a tint is the minimal generic
choice that already matched the old `upgradeWorkbench` behavior. A `textureForTier` lookup can slot
into `applyTierVisual` later if per-tier art is wanted, with no call-site changes.

Verified via `preview_eval`: apply Tool Sharpener → deducts twine 5→2 / wood 40→35 / stone 20→18,
tags tier=1 + gold tint; Destroy → loose drop carries tier=1 → pickup → inventory stack tier=1 →
re-place → tier=1 Workbench with tint (not tier=0); tier-0 and tier-1 Workbenches never share a
slot; popup shows the upgrade only when discovered+affordable (hidden when twine undiscovered,
absent on a maxed tier-1 bench). Type-check clean, no console errors.

**Same-day follow-up — full Upgrade panel + station level display (playtest feedback).** The
inline two-line ContextMenu upgrade list felt too cramped once a station could have several
tiers. Reworked so the context menu's **"Upgrade" button is always present** and always opens a
new full-page `src/ui/UpgradeMenu.ts` panel (same visual language as `DryingRackMenu`/
`CraftingMenu`) listing every discovered `StationUpgradeDef` for that station: **already-applied
tiers now render greyed with "(Applied)" instead of disappearing** (so the whole upgrade path is
visible, not just the next step), a tier beyond `current + 1` shows "(Requires previous tier)",
and an empty discovered list shows "No upgrades discovered yet." instead of an absent/blank
popup. Also added a **"Lvl N" display** (1-based — tier 0 reads as "Lvl 1") in two places: the
new panel's title (`stationDisplayName()`, e.g. "Workbench Lvl 2") and a small floating text
label anchored above the placed sprite itself (`refreshStationLabel()`), kept in sync on
placement/upgrade/destroy. See `STATUS.md`'s "Milestone K follow-up" entry for full file-level
detail and verification.

**Same-day follow-up round 2 — discovery toast, hover-only label, panel layout, tooltip level
(more playtest feedback).** Four independent fixes: (1) station upgrades now fire the same
"New Recipe Unlocked!"-style toast on discovery via a new `discoveredUpgradeIds` tracking set in
`refreshDiscovery()` — they'd never had one since they live outside the `Recipe`/`Crafting`
system entirely; (2) the floating "Workbench Lvl N" label is now hover-only (hidden by default,
toggled by a distance check added to `updateHover()`) instead of always visible; (3)
`UpgradeMenu.ts`'s row layout was reworked from a fixed row height to one derived from each row's
actual rendered description height, fixing descriptions overlapping the row below; (4)
`stationDisplayName()` moved into `StationUpgrades.ts` and `Tooltip.show()` gained an optional
`tier` param so backpack/hotbar/Drying-Rack tooltips also show "Workbench Lvl N", not just the
panel and floating label. See `STATUS.md`'s "Milestone K follow-up round 2" entry for full
file-level detail and verification.

**Original goal (for reference):** replace the single generic `workbench_upgrade` consumable with a
**named, per-station upgrade system** (e.g. "Tool Sharpener"), and make a station's upgrade tier
**survive Destroy → pickup → re-Place**, with a visual tell at each tier. This is genuinely new
architecture — recommend **Opus**, mirroring the Milestone A/C/H "net-new architecture" guidance
in the existing plan.

**Why this is architectural, not a tweak:** today a placed object's tier lives *only* on the
live `Image`'s `setData("tier", ...)` (`upgradeWorkbench()`, `MainScene.ts:1533-1540`) — there is
no concept of a tier tag surviving into an inventory stack. `destroyPlacedObject()`
(`MainScene.ts:1546-1570`) calls `spawnLooseDrop(itemKey, 1, ...)` with only the item key, so
**an upgraded Workbench's tier is silently discarded on Destroy today** (confirmed via
exploration — this is an existing latent bug, not a hypothetical). Fixing "upgrades persist
through Destroy/re-Place" requires threading a tier tag through: placed Image → loose pickup →
inventory stack → re-placed Image. `Inventory`/`ItemContainer` currently only track
`{key, count}` per stack — no per-slot metadata exists anywhere in the codebase.

**Scope:**
- **New per-slot metadata field** on inventory stacks (e.g. `ItemStack.tier?: number`), additive
  only — doesn't affect existing stackable resources (wood/stone/etc., which never set it).
  Placeable+upgradable items (workbench, future processors) should probably force `maxStack: 1`
  once tiered, so two different-tier instances never silently merge into one count — confirm
  this doesn't regress the common case of "only ever own one at a time" placement flow.
- **`spawnLooseDrop`/`ResourceNode`**: widen to carry the tier tag from a destroyed placed object
  through to the loose pickup, and `attemptPlaceObject()`/pickup-into-inventory to preserve it
  into the new stack metadata field.
- **Visual tier tell, generalized**: today an upgraded Workbench just gets a gold tint
  (`upgradeWorkbench()`). Generalize so any station's placed `Image` swaps texture/tint based on
  its tier at *every* render point (initial placement from a tiered stack, not just the live
  in-place upgrade path) — likely a small `textureForTier(itemKey, tier)` lookup.
- **Named upgrade recipes replace the generic `workbench_upgrade` item.** New data table (e.g.
  `src/systems/StationUpgrades.ts`): `StationUpgradeDef { id, name, description,
  appliesToItemKey, resultTier, costs: Partial<Record<ResourceType, number>> }`. First entry:
  **"Tool Sharpener"** — `{ appliesToItemKey: "workbench", resultTier: 1, costs: { twine: 3,
  wood: 5, stone: 2 } }`. Remove the old `workbench_upgrade` `ItemDef`/`Recipe` entirely — no
  intermediate craftable item, no separate consume-then-apply step.
- **Right-click "Upgrade" popup rework** (`ContextMenu.ts`): instead of a single "Upgrade"
  button that consumes a pre-crafted item, list every `StationUpgradeDef` matching this placed
  object's `itemKey` whose **ingredients have all been discovered** (per the locked decision
  above — undiscovered upgrades are invisible, not greyed), each showing name/cost/description;
  clicking one deducts the listed resources directly from the backpack and calls the
  generalized tier-bump + visual-swap logic.
- Gremlin armor pieces (Milestone M) will need this same per-instance-tier plumbing for their
  own level-1/level-2 states — land K first, M reuses it rather than re-inventing a parallel
  mechanism.

---

## Milestone L — New resource: Bones (Boar loot) — SHIPPED 2026-07-08

**Goal:** small, mechanical — unblocks Milestone I's Drying Rack recipe and Milestone M's
Gremlin Shirt.

- `Inventory.ts`: add `bones` to the `ResourceType` union.
- `Items.ts`: new `ItemDef` (texture/icon via `BootScene.ts`, same pattern as `boar_meat`).
- `Enemy.ts`/`MainScene.spawnEnemies()`: add a `bones` entry to the Boar's `loot: LootEntry[]`
  spawn config (one-line addition — `LootEntry`'s shape already supports an arbitrary
  `ResourceType`, no type changes needed). Suggested `min: 1, max: 2`, tunable at
  implementation time.

**Shipped as planned, no deviations**: `bones` added to `ResourceType`, new `ItemDef` +
`icon_bones` texture (two crossed off-white bones), Boar's `loot` array in
`MainScene.spawnEnemies()` gained `{ resource: "bones", min: 1, max: 2 }` alongside the
existing `boar_meat` entry. Verified via `preview_eval`: a live Boar's `rollLoot()` returns
both entries. See `STATUS.md` for full detail.

---

## Milestone M — Gremlin Armor set (first wearable armor)

**Goal:** wire up the long-dormant `Equipment.ts` slot system for real, and ship the three
Gremlin armor pieces with per-piece upgrade levels.

- **New items** (replace the current single undifferentiated `gremlin_leather_armor` recipe,
  which predates this per-slot spec and doesn't map to any `EquipSlot`):
  - **Gremlin Cap** → `EquipSlot.helmet`. Cost `gremlin_leather: 1, blackberry: 5`. Upgrade to
    lvl 2: `gremlin_leather: 1, blackberry: 1`.
  - **Gremlin Shirt** → `EquipSlot.chest`. Cost `gremlin_leather: 3, leather: 1, bones: 5`.
    Upgrade to lvl 2: `gremlin_leather: 2, bones: 2`.
  - **Gremlin Pants** → `EquipSlot.legs`. Cost `gremlin_leather: 2, leather: 2, blackberry: 1`.
    Upgrade to lvl 2: `gremlin_leather: 1, leather: 1`. **Lvl 2 requires Workbench lvl 2**
    (i.e. gated on the Workbench having reached the tier Milestone K's "Tool Sharpener" upgrade
    grants — reuse that same tier-gate check, generalized past just recipe-crafting into
    armor-upgrading).
  - All three: `category: "armor"`, `tier: 1` (workbench-gated to craft, per the other tier-1
    armor precedent), `armorSlot` field added to `ItemDef` pointing at the matching `EquipSlot`.
- **Equip mechanism** — both interactions requested should work:
  - **Drag** the item from the backpack onto its matching empty slot icon in
    `InventoryMenu.ts`'s paper-doll grid (`renderArmor()`) — reuses the existing drag
    infrastructure (`resolveItemDrag()`), needs a new drop-target case for "armor slot box" the
    same way the Drying Rack's input box is a drop target today.
  - **Right-click** an armor item in the backpack auto-equips it to its slot — extends the
    existing right-click handler (already branching on `placeable` per Milestone J) with an
    `armorSlot` check that calls `equipment.set(slot, key)` instead of `quickMoveItem`.
  - Equipping should swap whatever was previously in that slot back to the backpack (standard
    swap semantics), not just overwrite and lose the old piece.
  - **Per-piece upgrade level** reuses Milestone K's per-instance-tier stack metadata — an
    equipped armor item's level lives on the same field a placed station's tier does, just
    applied to a worn (not placed) item. The actual **stat effect of wearing armor at all**
    (defense value, damage reduction) doesn't exist yet — per the standing "damage
    types/resistances are a later concern" note in `CLAUDE.md`, equipping should visually
    reflect in the paper-doll slot and be trackable, but a numeric defense stat is out of scope
    for this milestone unless a trivial flat-reduction hook already exists to reuse (check at
    implementation time; don't build a new resistance system just for this).

---

## Milestone N — Blackberry bushes: harvest berries, keep the bush

**Goal:** first "stays in the world after harvest" node — a genuinely new `ResourceNode`
behavior, not a variation on the existing hit-until-depleted-then-destroy pattern used by
every node in the game today (confirmed via exploration — no multi-harvest/persistent node
exists anywhere currently).

- Change blackberry bushes (`MainScene.ts:824` scatter config) from `action: "pickup"` +
  destroy-on-deplete to a new node mode that, on harvest, **yields the berry item but does not
  destroy the sprite** — swap to a distinct "picked" texture (bare bush, no berries) instead of
  removing it from the world.
- **Open design question to settle at implementation time (not locked by the user's note):**
  does a picked bush ever regrow? The user only said "berries removed, not the whole bush" —
  regrowth wasn't specified. Recommend a regrow timer (e.g. a few in-game minutes back to
  harvestable, "picked" texture reverting to full) since it fits the game's Valheim-like
  foraging feel and keeps blackberries renewable without needing more bushes scattered — but
  flag this explicitly as a recommendation, not a locked decision, since it wasn't asked.
- `ResourceNode.ts`: needs a new harvest-without-deplete code path (today `deplete()`,
  `ResourceNode.ts:210-215`, always destroys) — likely a new `harvestType: "consume" |
  "berries"` (or similar) config flag rather than overloading existing fields.

---

## Milestone O — Resource-density audit for the new costs

**Goal:** verify (and very likely retune spawn counts for) enough of each resource exists in
one session's starting biome to craft the full new content list with margin, per the user's
explicit ask. This is verification + tuning, done last once all the above numbers are locked,
not new code beyond spawn-count constants.

**Math worked out this session (flag to the user — two real shortfalls found):**
- **`gremlin_leather` demand**: Cap 1 + Shirt 3 + Pants 2 = 6 base, + upgrades (Cap 1 + Shirt 2 +
  Pants 1) = 4 → **10 total**, plus margin. Supply is 1:1 from `gremlin_skin`, which **only the
  ranged Gremlin variant drops**, and today's spawn count is **4 ranged Gremlins per session**
  (deliberately tuned rare/strong in Milestone C) — max 4 `gremlin_leather` ever obtainable, well
  short of 10. **Recommend bumping `RangedGremlin` spawn count** (e.g. 4 → ~16-20) to cover the
  armor set plus margin — a real departure from Milestone C's original "rarer, stronger" tuning
  intent, worth calling out explicitly rather than quietly overriding it.
- **`leather` (Leather Scraps) demand**: Drying Rack 4 (Milestone I) + Stone Pickaxe 1 + Stone
  Club 1 + Gremlin Shirt 1 + Gremlin Pants 2 = **9**, plus margin, plus the fact this resource
  was already the tightest one in the game (only source is Snake, 1 per kill, 6 Snakes spawned
  today = 6 total — already short even before this session's new costs add 7 more demand).
  **Recommend bumping Snake spawn count** (e.g. 6 → ~14-16) alongside the ranged-Gremlin bump.
- **`bones`**: new demand is Drying Rack 2 + Gremlin Shirt 5 + upgrade 2 = 9, plus margin; 12
  Boars at even a conservative 1-2 bones/kill (12-24 total) comfortably covers it — no spawn
  change needed, just confirm once Milestone L's loot entry lands.
- **`twine`/`blackberry`/`wood`/`stone`**: demand is small relative to existing spawn counts
  (22 cattail → up to 11 twine vs. 3 needed for Tool Sharpener; 16 bushes vs. 6 blackberries
  needed across the armor set) — no changes expected, just a final `preview_eval` sanity count
  once everything else ships.

---

## Sequencing

```
I (Drying Rack polish)  — needs L (bones) for the recipe-cost change; slider/description/tab
                           parts are independent and can ship without L if sequenced first.
J (placement robustness + re-place from inventory) — independent, any time.
K (per-instance tiers + named upgrades) — foundational for M (armor levels reuse this).
L (bones) — SHIPPED 2026-07-08. small, independent, unblocks I and M.
M (Gremlin armor) — depends on K (tier/level plumbing) and L (bones for Shirt).
N (blackberry persist) — independent.
O (resource audit) — do last, once I/K/L/M's exact numbers are locked; will very likely bump
                      RangedGremlin and Snake spawn counts as concrete follow-up edits.
```

Recommended order: **L → I → J → K → M → N → O** (bones first since two other milestones need
it; J and N can slot in anywhere convenient). **L, I, and J are done; K is next up** (or N,
which is independent). K is flagged as net-new architecture — recommend Opus.

## Verification (each milestone, per the project's standing convention)

1. `node node_modules/typescript/bin/tsc --noEmit`.
2. `preview_start` → `preview_screenshot` to confirm boot.
3. `preview_eval` against `window.__game.scene.getScene('MainScene')` for logic — e.g. for O,
   force spawn configs and count resulting enemy tallies; for K, destroy an upgraded Workbench
   and confirm the re-placed instance's texture/tier match what was destroyed; for M, drag/right-
   click-equip an armor piece and confirm `equipment.get(slot)` updates and the previous
   occupant returns to the backpack.
4. `preview_console_logs` (level `error`).

## CLAUDE.md updates to make once this plan is approved

- Add a new roadmap bullet (after item 4e/Milestone H) summarizing this batch as **"4f —
  Drying Rack polish, station-upgrade rework, Gremlin armor (first wearable armor)"**, pointing
  at the new plan file path.
- Update "First biome — content notes" → **Crafting/cooking** and **Enemies** sections: note
  the Gremlin armor set's real costs/slots (replacing the vague "not yet wearable" caveat once
  M ships), the `bones` resource, and the RangedGremlin/Snake spawn-count bump once O lands.
- Note the tab reorg (Workbench/Campfire/Drying Rack → Crafting tab, Shishkabob → Misc) wherever
  `CLAUDE.md` currently describes the crafting-menu tab list.
