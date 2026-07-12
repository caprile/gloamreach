# Playtest polish batch (post-5y) — SFX feel, notification fix, crafting/cooking UX, gating

> **STATUS: SHIPPED + live-verified 2026-07-11 (roadmap 5z).** All 13 items done, plus
> the #14 forge-UI consolidation. Built on Sonnet per the model-switch convention (fixes/
> UI/tuning on already-designed systems, no new mechanic). `tsc --noEmit` clean, full
> `npm run build` succeeds, extensive live `preview_eval` verification (console
> error-free). Full writeup in `STATUS.md` (### 5z). One deliberate non-change: #14's
> trophy-generalization question was answered "don't merge" — species trophies (Boar/
> Snake/Gremlin) stay separate as drops; only the Relic Forge's roll UI was consolidated
> (grouped by rarity, not species).

## Context

A grab-bag off a playtest of the 5y build ("Overall awesome; enemies scarier, boss feels
better, trophy relic system good"). 13 actionable items + one UI consolidation that fell
out of the #14 discussion. Everything reuses existing systems (`Sfx`, `EventLogUI`,
`ProgressBar`, the crafting/cooking/placement menus, `Crafting.refresh` discovery gating).

## Group A — SFX & level-up feel

- **#3 Hit sound too annoying (subtler).** `Sfx.hit()` fires on EVERY hit, both
  directions (`resolveWeaponHit` + `applyDamageToPlayer`). Drop its `gain` ~0.1 → ~0.035
  and shorten (90ms → ~55ms) so it's a soft tick, not a jab. `Sfx.ts` only.
- **#4 Skill level-up SFX cue.** Today `sfx.levelUp()` fires ONLY on Player level-up
  (`MainScene.showLevelUpBanner`, ~line 5072). Skill level-ups (`skills.onLevelUp`,
  ~line 862) are silent. Add a distinct, quieter cue (e.g. a new `Sfx.skillUp()` — a short
  two-note blip, gain ~0.06, clearly lower-key than the player-level triad) and call it in
  the `skills.onLevelUp` handler. Keep the fuller `levelUp()` for the rarer Player level.
- **#8 Level-up full-screen flash too much.** `showLevelUpBanner` still calls
  `this.cameras.main.flash(300, 48, 36, 12)` (~line 5108). Soften hard (shorten to ~180ms
  AND dim the color further, e.g. 24,18,6) or drop the flash entirely — the punch-in
  banner is already the "big deal." Leave the banner tween/scale as-is.
- **#5 Boar charge recovery + overshoot.** `Boar.ts` charge reads as recovering too slow
  and overshooting the player too far. Reduce the charge overshoot distance and shorten the
  post-charge recovery window so it's punishable but doesn't sail way past. Tune numbers in
  `Boar.ts` only (mirror the existing charge state fields). Keep it telegraphed/dodgeable.

## Group B — Top-middle notification overlap (#7) — root cause found

`EventLogUI.showToast` (the centered `info`/`levelup`/`combat` toast) positions by a bare
counter: `y = 72 + this.activeToasts * 40`, and only decrements `activeToasts` when a
toast's fade tween **completes**. Toasts share the same `delay: 2200` so the FIRST-created
completes first → the counter drops while a still-visible later toast keeps its slot → the
next toast reuses that exact `y` and **overlaps** (cooking rapidly = "Cooked X" toasts
colliding; affects all `info`/`combat` toasts too).

**Fix:** manage active center-toasts as a reflowing list with stable slots, exactly like
the `activeRecipeToasts: { height }[]` pattern already in this same file
(`spawnRecipeToast`). Push a `{ box, text }` (or a height entry) per toast, compute the new
toast's `y` from the cumulative stack, and `splice` it out on fade-complete (optionally
re-flow the survivors upward). Drop the `activeToasts` counter. `EventLogUI.ts` only.

## Group C — Crafting/cooking UX

- **#6 Keep the crafting menu open in placement mode; clicking another recipe SWITCHES the
  placement target instead of placing.** This deliberately reverses the 40-min-batch fix
  that closed the crafting menu on `startPlacement` (which existed to stop a fall-through
  "every craft click drops a workbench" bug). New approach:
  - `startPlacement(recipe)` no longer closes `craftingMenu`.
  - The global `pointerdown` handler (MainScene ~line 714–725) already guards a click over
    the crafting panel while in placement mode (line 721 `return`s) — but that just
    swallows it. Instead, when a placeable recipe row is clicked in the crafting menu while
    `placementMode` is active, **re-arm** placement to the new recipe (swap
    `placementMode.recipe` + rebuild the ghost texture) rather than crafting/placing. A
    non-placeable recipe clicked during placement should behave normally (craft it).
  - The cleanest seam: the CraftingMenu's row `onClick` → `deps.startPlacement(recipe)`
    already routes placeables through `startPlacement`. Make `startPlacement` idempotent —
    if already in `placementMode`, just swap the recipe + ghost (don't set
    `suppressNextPointerdown` again, don't re-close anything). World placement clicks
    (`attemptPlaceObject`) are unaffected because they only fire for pointerdowns NOT over
    the crafting panel (existing line-721 guard stays).
  - Verify the old fall-through bug stays fixed: a click landing ON the crafting panel must
    never call `attemptPlaceObject` (it doesn't — line 721 returns before line 722).
- **#9 Batch slider above "Craft" for stackable-output recipes.** In the crafting-menu
  detail panel, for recipes whose output is stackable AND the player can afford >1 batch
  (Shishkabob, Slingshot Pellets, Javelin), show a quantity slider above the Craft button
  (0..maxAffordable batches). Craft runs one `ProgressBar` for the whole batch and grants
  N×output at completion (commit-at-end, same pattern as the Drying Rack slider + the
  existing craft ProgressBar). Non-stackable/tier items keep the plain single Craft button.
  Reuse `ProgressBar`; don't add a per-item timer.
- **#11 Bulk cooking.** Same shape in `CookingMenu`: the recipe list → a shared Craft
  button + a quantity slider (0..maxAffordable) → one `ProgressBar` → grant N dishes at
  completion. Purely a reduce-clicks convenience; cooking stays instant-per-batch,
  station-gated (campfire tier check unchanged). `cookAtCampfire` already makes 1; extend to
  an amount, or loop it at bar completion.
- **#12 Drying Rack output slot shows the output item's image.** In `DryingRackMenu`, the
  output slot currently shows the "→ N Twine" preview text; also render the OUTPUT item's
  icon in that slot (look up the process recipe's output key → `itemDef().texture`), so it
  reads visually like the input slot. `DryingRackMenu.ts` only.
- **#10 Skewer recipe + art.** `Recipes.ts`: Shishkabob output `count: 2` and cost
  `1 wood` (currently 1→1; make it 1 wood → 2 shishkabobs). `BootScene.ts`: redraw the
  `shishkabob` texture as **just a bare stick** (it currently looks pre-loaded with food).
  Update `RECIPES.md` Shishkabob row.

## Group D — Gating

- **#1 Javelin gate.** `Recipes.ts` javelin recipe: `tier: 1` (so it only appears once a
  Workbench has been placed AND requires being near one to craft — like Stone Pickaxe /
  Slingshot) + `requiredSkills: [{ skill: "pierce", level: 5 }]`. Update `RECIPES.md`.
- **#2 Slingshot Pellets gated behind crafting a Slingshot.** Add a small
  `requiresDiscovered?: string[]` field to `Recipe` and check it in `Crafting.refresh`
  (`discoveredItems.has(k)` for every k). Set `requiresDiscovered: ["slingshot"]` on the
  pellets recipe. Crafting a slingshot already routes its output through
  `addToBackpack → discoverMaterial → discovered.add("slingshot")`, and `slingshot` is not
  a world pickup, so this effectively gates pellet discovery on having crafted a slingshot.
  Update `RECIPES.md` note.

## Group E — #14 fork: consolidate the Relic Forge roll UI (keep species trophies)

Locked: DON'T merge the trophy data model (species trophies stay as drops — flavor +
M-W1 per-source-rarity scaffolding). Instead reduce the forge friction: replace the
per-species "Roll Boar Trophy / Roll Snake Trophy…" buttons (5n wrapped them into rows of
2) with **one "Roll a Common Trophy" button** that consumes whichever raw Common trophy the
player has (any species), showing the total count across species. `RelicForgeMenu.ts` +
a small MainScene/`Relics` helper to pick an available raw-Common trophy key to roll (the
roll pool + pity are already shared across species per 5n, so behaviour is identical). The
Refine tab (which already accepts mixed-species input) is unaffected.

## Group F — Investigate only (#13, likely no code)

- **#13 Dashboard sometimes doesn't load even when the port matches.** `/dashboard.html`
  is a second Vite entry — it only serves while `npm run dev` is actually running THIS
  project. Almost certainly the dev server isn't up, or a **stale orphaned Vite process
  from a closed chat is holding the port** (hit exactly this in 5y — 5 orphaned processes
  maxed the per-folder server cap, so the port answered but served a different/stale tree).
  Confirm by checking running node/vite processes; if that's it, it's environmental (kill
  orphans + `npm run dev`), no code change. Only add a guard/doc note if something in the
  build config is actually wrong.

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit` after each group; full `npm run build`
   at the end.
2. Live via `preview_eval` / screenshots (per CLAUDE.md workflow):
   - A: hit SFX audibly softer; skill level-up plays its new cue; Player level-up flash is
     gentle; Boar charge recovers faster + overshoots less.
   - B: fire several `info` toasts in quick succession (rapid cook) → they stack without
     overlapping, even as the earliest fades.
   - C: enter placement from the crafting menu → menu stays open; clicking another placeable
     recipe swaps the ghost without placing; a world click places; the old
     workbench-fall-through bug stays fixed. Batch slider crafts N shishkabobs/pellets in
     one bar. Bulk-cook N dishes in one bar. Drying Rack output slot shows the output icon.
     Shishkabob costs 1 wood → 2 out with a bare-stick icon.
   - D: Javelin hidden until a Workbench is placed + Pierce ≥ 5, and needs a nearby bench to
     craft; Pellets hidden until a Slingshot is crafted.
   - E: forge shows one "Roll a Common Trophy" button consuming any species; roll odds/pity
     unchanged.
3. Update `RECIPES.md` (shishkabob, javelin, pellets) + `STATUS.md` + the dashboard if any
   recipe/stat changed. Commit this plan file alongside the feature.
