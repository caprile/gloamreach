# Plan: Cooking & Food Buffs

The first food/consumable loop, plus the game's first **status-effect (buff)**
system. Built on top of the existing campfire + station-upgrade + processing
patterns. New core mechanic → built on **Opus 4.8** (per the model-switch
convention).

## Locked design decisions (from the user, this session)

1. **Eating = a timed HP-regen buff only.** No instant heal (the user dislikes
   spam-insta-heal). Each food defines its own `hpPerSec` and `durationMs`; the
   buff heals over time via `Health.heal()` and expires. Overheal at full HP is
   simply wasted — a natural anti-spam property.
2. **Cooking is instant + station-based** (reuse the Drying-Rack *feel*: interact
   with the campfire → menu → produce the item now, no cook-over-time timer).
3. **No hunger/food meter.** Food is purely a consumable you eat for a buff.
4. **Buff icons** shown above the HP bar; hovering one shows the active buff
   (name, +HP/sec, seconds remaining).
5. **Foods this pass:**
   - **Cooked Boar Meat** — `boar_meat` + `shishkabob`, at a **Lvl 1 campfire**
     (any campfire).
   - **Bramble-Glazed Boar Skewer** *(working name — a "boar meat + berry jam"
     dish; alternatives: "Bramble Boar Skewer", "Berry-Glazed Skewer", "Jamboree
     Skewer")* — `boar_meat` + `blackberry` + `shishkabob`, at a **Lvl 2
     campfire**. Stronger buff.
6. **Campfire becomes upgradable to Lvl 2** via a **20-stone** upgrade (reusing
   the existing `StationUpgrades.ts` + right-click Upgrade popup). Lvl 2 unlocks
   the better cook recipe. (Future: more campfire tiers / a dedicated cooking
   station — out of scope now, but nothing here blocks it.)

## Architecture decision to confirm — cooking UI

Cooking recipes are **multi-ingredient** (2–3 items → 1 food), which does *not*
fit the Drying Rack's single-input + amount-slider `Processing.ts` model. Two
ways to honor the "instant, station-based" intent:

- **(Recommended) New `src/ui/CookingMenu.ts`** — a dedicated cook station menu,
  structurally cloned from `DryingRackMenu.ts`'s flat-`scrollFactor(0)`-GameObject
  style: player backpack on the left, a **list of cook recipes** on the right
  (each row = ingredients + output + a "Cook" button, greyed if unaffordable or
  above the campfire's tier). Opened by clicking a placed campfire. Cook recipes
  live in a new small `src/systems/Cooking.ts` table. Best matches the stated
  "station you interact with" vision and stays cleanly separable for the future
  dedicated cooking station.
- **(Cheaper alt, not recommended)** Cook recipes become normal `RECIPES[]`
  entries in a new "Cooking" category gated on campfire-tier proximity, and
  clicking a campfire opens the **existing crafting menu** (exactly like the
  Workbench does as of Group A). Less code, but overloads the generic crafting
  panel and loses the distinct station feel.

**Plan proceeds with the Recommended option.** Flag on plan review if you'd
rather take the cheaper alt.

## New files

### `src/systems/Buffs.ts` — status-effect manager (framework-free)
- `interface ActiveBuff { id: string; name: string; icon: string; hpPerSec: number; remainingMs: number; totalMs: number }`
- `class BuffManager`:
  - `apply(buff)` — adds a buff; **re-applying the same `id` refreshes its
    duration to full** (no infinite stacking of one food). Different `id`s run
    concurrently (their HP/sec add up).
  - `tick(delta, health)` — decrements each buff's `remainingMs`, heals
    `hpPerSec * delta/1000` per active buff, drops expired ones. Returns whether
    anything healed (so the scene can refresh the HP bar) and whether the set
    changed (so the buff HUD re-renders).
  - `active(): ActiveBuff[]` — for the HUD.
  - `clear()` — called on death/respawn.
- No Phaser dependency (like `Stamina`/`Health`); `MainScene.update()` drives it.

### `src/ui/BuffBarUI.ts` — buff-icon strip above the HP bar
- A row of small square icons (buff's food texture as the icon), centered
  horizontally, sitting one row above the HP bar (`healthBar` Y − gap − size).
  `scrollFactor(0)`, depth in the 2800–2802 HUD band (per the "fixed HUD depth
  must clear WORLD_H" rule).
- Each icon is hoverable → a small bespoke tooltip: `"<name>\n+X HP/sec · Ns
  left"`. Countdown text refreshes each frame while visible; a thin depletion
  bar under each icon is a nice-to-have (MVP = hover tooltip only).
- Rebuilt when the active-buff set changes; countdown/hover text updated per
  frame.

### `src/systems/Cooking.ts` — cook recipe table
- `interface CookRecipe { id; name; inputs: Partial<Record<ResourceType, number>>; output: string; requiredCampfireTier: number }`
- Two entries (Cooked Boar Meat, Bramble-Glazed Boar Skewer).
- Helpers: `cookRecipesForTier(tier)`, and reuse `ItemContainer.count` /
  `removeCount` for affordability + consumption (the same primitives
  `Crafting.craft()` uses).

## Changed files

### `src/systems/Items.ts`
- New `edible?: { hpPerSec: number; durationMs: number }` field on `ItemDef`.
- New item defs (all `maxStack: 99`, `hotbarable: true` so food can sit in the
  hotbar for quick right-click eating):
  - `cooked_boar_meat` — edible `{ hpPerSec: 2, durationMs: 20000 }` (~40 HP over
    20s). Description hints "Right-click to eat."
  - `bramble_boar_skewer` — edible `{ hpPerSec: 3, durationMs: 30000 }` (~90 HP
    over 30s).
- Update `boar_meat` / `blackberry` descriptions to point at cooking (drop the
  "no eating mechanic yet" note on blackberry).
- All numbers first-pass/tunable.

### `src/scenes/BootScene.ts`
- Generate `icon_cooked_boar_meat` and `icon_bramble_boar_skewer` placeholder
  textures (reuse the boar-meat/berry palettes). Buff icons reuse these food
  textures — no separate buff art needed.

### `src/systems/StationUpgrades.ts` + `RECIPES.md`
- Add a campfire upgrade:
  `{ id: "cook_grate", name: "Stone Hearth", appliesToItemKey: "campfire",
     resultTier: 1, costs: { stone: 20 }, deltaLabel: "Unlocks Lvl 2 recipes" }`.
- `stationDisplayName()` already renders "Campfire Lvl 2" once an upgrade exists,
  and the generic right-click Upgrade/Destroy popup + tier-survives-Destroy
  plumbing already work for any placed object — **no new upgrade wiring needed.**
- Update `RECIPES.md` with the campfire upgrade and the cook recipes.

### `src/scenes/MainScene.ts`
- **Hover/interact:** add campfires to `updateHover()` (a `hoveredCampfire`,
  sourced by filtering `placedObjects` for `itemKey === "campfire"`, mirroring
  the `hoveredWorkbench` pattern from Group A) and a `promptForCampfire()` →
  `"[LMB] Cook"` when in reach. `tryInteract()` gains a campfire branch → open
  the CookingMenu bound to that instance (track `openCampfire`, like `openRack`).
  Right-click still routes to the generic Upgrade/Destroy popup (unchanged).
- **CookingMenu wiring:** `createCookingMenu()`; deps expose backpack, skills,
  the open campfire's tier, an affordability check, and a `cook(recipeId)` that
  consumes inputs via `removeCount` and deposits the food into the backpack (or
  drops it on the floor if full — reuse the existing overflow-drop path).
- **Eating gesture:** **right-click an `edible` item** in the backpack or hotbar
  eats one (consume 1 from the stack → `buffs.apply(...)`, event-log line,
  refresh HUD). Wired in `InventoryMenu`/`HotbarUI` pointerdown right-button
  branches, checked before the existing context-menu/quick-equip branches (food
  has no context menu). Item tooltip shows the buff stats + "Right-click to eat".
- **Buff system:** construct `this.buffs = new BuffManager()` and
  `this.buffBarUI`; in `update()` call `buffs.tick(delta, health)` → refresh HP
  bar + buff HUD when it reports changes. Clear buffs in `onPlayerDeath()` /
  respawn.

### `src/ui/Tooltip.ts`
- Render the `edible` stats (`+X HP/sec for Ns`) and a "Right-click to eat" hint
  for food items, alongside the existing stat lines.

## Out of scope (deferred, not forgotten)
- Cook-over-time / burning food, a dedicated cooking station, campfire tiers past
  Lvl 2, a Cooking skill/XP, hunger meter, food-scaled max stamina (the
  `Stamina.ts` hook stays), non-HP buffs (stamina regen, damage, etc.),
  save/load of active buffs.

## Verification
1. `tsc --noEmit`.
2. `preview_start` + `preview_screenshot`.
3. `preview_eval`: craft/place a campfire; open the cook menu; confirm Cooked
   Boar Meat is cookable at tier 0 and the Skewer is tier-1-gated; apply the
   20-stone upgrade → campfire reads "Lvl 2" and the Skewer unlocks; cook both;
   right-click-eat one and assert a buff appears, HP ticks up over time, the buff
   HUD shows it with a live countdown + hover tooltip, and it expires cleanly;
   re-eating refreshes duration rather than stacking; death clears buffs.
4. `preview_console_logs` (level error) clean.

## Docs to update on ship
`STATUS.md`, `CLAUDE.md` (roadmap + first-biome cooking notes → shipped),
`RECIPES.md`, and the relevant memory files. Commit this plan file alongside.

## Shipped

Implemented as planned, then refined same-session off an immediate playtest pass.
Deviations from the plan as originally written:

- **Recipe discovery added** (not in the original plan): cook recipes now go
  through the same "New Recipe Unlocked!" toast pattern as crafting recipes —
  Cooked Boar Meat unlocks on first campfire placement, Bramble-Glazed Boar
  Skewer on first upgrade to Lvl 2 (`MainScene.discoverCookRecipes`,
  `discoveredCookRecipeIds`).
- **Cook menu behavior changed**: instead of showing a higher-tier dish dimmed
  with "Requires Campfire Lvl N" (as planned), `CookingMenu` now filters
  `COOK_RECIPES` to `requiredCampfireTier <= openCampfireTier` — a locked dish
  isn't listed at all until the campfire is upgraded. The panel also now resizes
  to the number of visible rows.
- **Stone Hearth cost changed** from the planned 20 Stone to **4 Twine + 20
  Stone**.
- **Bug fixed, not originally scoped**: right-click → Destroy on a placed
  station (Campfire, Workbench, ...) was falling through and reopening that
  station's menu on the same click, because `ContextMenu` closes its popup
  *before* running `onClick`, so the scene's global `pointerdown` handler saw
  the menu already closed and treated the click as a world interact. Fixed via
  the same `suppressNextPointerdown` guard the placement system's "Place"
  button already used for an identical double-fire class of bug.
- **New eat gesture**: selecting a food item in the hotbar and left-clicking on
  open ground (no hovered node/enemy/station) now eats it too, alongside the
  original right-click gesture.
- **Buff cap added** (not in the original plan): `BuffManager` now caps
  concurrent buffs at 2 (`maxBuffs`, settable for future items/effects) — a 3rd
  distinct buff evicts whichever active buff has the least time remaining.

See `STATUS.md`'s "Just finished" entry for full verification detail on both the
initial ship and this follow-up pass.
