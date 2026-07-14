# S5 + S6 (badlands playtest triage) + Inventory Rework

Final two sessions of `badlands-playtest-triage.md`, merged into one pass (the plan
explicitly allowed S5+S6 to merge). The S6 "inventory sort" item grew — via a design
conversation with the user — into a full **inventory rework**, which is the centerpiece
here and the reason this session runs on **Opus** (new data model + UI mechanic); the
rest of S5/S6 are Sonnet-class fixes bundled in.

## Locked inventory design (AskUserQuestion, 2026-07-13)

1. **Storage model: auto-organized pages** — no manual arranging; the backpack stays a
   single flat `ItemContainer` (so every existing drag/hotbar/equip/chest/trash path is
   untouched), and the menu renders it as **filtered, auto-sorted views**. Not pouches.
2. **Capacity: effectively unlimited** — the backpack grows from 36 to a generous fixed
   size (240 slots) that a single hardcore run cannot realistically overflow. Inventory
   stops being a thing to manage.
3. **Tabs by biome** — one horizontal tab per biome present (Forest / Badlands / …), plus
   an **All** tab. Within a tab, items group into labelled **sections** (Raw, Processed,
   Gear, Stations, Food, Trophies/Currency). A **search bar** (always usable while the
   inventory is open) filters across every tab by item name.

## Inventory rework — implementation

- **`ItemDef.biome`** (new field, `Items.ts`): `"forest" | "badlands"` = the first biome
  an item appears in. Hand-tagged per def (static data, drift-free). Wood/stone = forest
  (first appearance) even though badlands also drops them. A helper `itemBiome(key)`
  defaults to `"forest"` for anything untagged so nothing ever falls off a tab.
- **`ItemCategory`** derivation (`Items.ts`, `itemCategory(key)`): a pure function off the
  existing def fields — `placeable` → Stations; `edible` → Food; `weapon`/`tool`/`armorSlot`
  → Gear; trophy/shard/currency keys → Trophies; Drying-Rack/Smelter outputs (twine,
  leather, guck, ingots) → Processed; else → Raw. No new per-item data for category.
- **Backpack size 36 → 240** (`BACKPACK_SIZE`). Verify nothing hard-codes 36 in a way that
  breaks (chest Take-All room checks, craft/cook batch sliders — all read `roomFor`, fine).
- **`sortAndStack` grouped by biome** (S6 #8): extend the existing sort comparator to order
  by `(biome, category, key)` so the underlying flat container is always biome-clustered —
  the tabbed view reads directly off that ordering.
- **`InventoryMenu.ts` rework** (the bulk): replace the fixed 6×6 backpack grid with
  - a **tab strip** (biomes present + All) above the grid,
  - a **search input** (Phaser text-capture; typing filters the visible items by name,
    overriding the active tab while non-empty),
  - a **sectioned, paginated grid**: the active tab's items are pulled from the flat
    container (filtered by biome + search), grouped by category with a small section
    label, and laid into the grid; if a tab overflows the visible rows, a lightweight
    scroll (reuse the windowed-render pattern from the memory note) — target sizing so a
    biome never overflows in practice.
  - Drag semantics: **dragging OUT** of a rendered slot (→ hotbar/equipment/trash) maps to
    the real flat-container index and works unchanged. **Dragging IN** (hotbar→backpack)
    calls `backpack.add()` then re-sorts. **No free-arrange within the backpack** (it's
    auto-sorted) — this is a deliberate simplification consistent with "never fight the UI".
- **Equipment-slot → trash drag** (S6 #9): the last missing drag path — allow a drag that
  began via `beginArmorDrag` to resolve onto the InventoryMenu trash box (delete the
  equipped item). Wire in `resolveItemDrag`'s trash branch.
- **Processor menus show only compatible items** (#6, `DryingRackMenu.ts`): replace the
  "whole backpack shown with non-input items dimmed" panel with a compact list of ONLY the
  items the station can accept (its recipe inputs the player currently owns). Applies to
  both the Drying Rack and the Smelter (shared menu).

## S5 — recipe/upgrade gating & dev-command bugs

- **WB Lvl 3 recipes gate on actually reaching WB Lvl 3** (not recipe-discovery before the
  upgrade): add a sticky `everReachedWorkbenchTier(n)` (max tier ever placed, mirrors the
  existing `everPlacedWorkbench` flag) and gate discovery of `requiresWorkbenchTier`
  recipes on it. Proximity (`isNearWorkbenchAtTier`) still gates crafting.
- **Ember Crucible visible while Smelter is placed** (not only after pickup): the Smelter
  upgrade-availability check reads currently-placed state incorrectly — surface it whenever
  a Smelter exists/placed, consistent with the Workbench upgrade flow.
- **`nobuildcost` dev cmd fix** (inverted): it should NOT permanently unlock all recipes,
  and it SHOULD grant free station/armor/weapon upgrades. Flip both in the `__dev` console
  + the affordability checks that read the flag.

## S6 — text/UX polish grab-bag

- **Effigy text**: rename `warren_fetish` "Gloam-Bone Fetish" → "Gloam-Bone Totem" and fix
  the Effigy item + recipe descriptions that still say "warren fetishes".
- **Emberblink tooltip off-screen**: wrap/clamp the tooltip text width so long set-bonus
  descriptions don't run off the screen edge.
- **Molten Bulwark rework** (decision 2): knockback-immunity → fire thorns + flat % DR
  (`SetBonuses.ts` desc + MainScene hook).
- **Station contrast**: Workbench / Drying Rack (and other stations) hard to see on the
  badlands floor — add an outline/contrast tell to the placed sprites.

## Verify
`tsc --noEmit`, then live `preview_eval`: tabs render + switch, search filters, sort is
biome-grouped, processor shows only compatible inputs, equipment→trash drag deletes, WB
Lvl 3 gate, Ember Crucible visibility, nobuildcost behaviour, set-bonus DR/thorns.
Update `RECIPES.md` if any recipe/upgrade text changes; dashboard reads data modules live.
```
```
