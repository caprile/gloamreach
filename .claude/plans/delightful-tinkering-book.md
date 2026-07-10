# Playtest Batch — Group A: Quick Fixes

## Context

Fresh playtest feedback after beating the Gremlin King (player lvl 5, Blunt 5/Pierce
10/Light Armor 5/Running 3/Chopping 4, max-lvl Primal Spear). The user gave a longer
list of "prepare to implement" items and asked to group them into milestones, tackling
one at a time — confirmed via `AskUserQuestion`: **Group A (this plan) → Group B
(HUD/stats display) → Group C (Elites + Trophy-gated Totem)**. This plan covers Group A
only: six small, independent playtest fixes. A "notes for later" list (food system, HP
regen, roguelike ideas, minimap rework, etc.) was already appended to `CLAUDE.md`'s
Long-term design notes section as pure documentation — no code for those yet.

Researched via 3 parallel Explore agents + direct file reads before writing this plan;
findings are folded into each item below.

## Items

### A1 — Running skill levels faster early game
`src/scenes/MainScene.ts:540` grants a flat `10 * (delta/1000)` XP/sec to `running`
while sprinting (`skillXpToNext(level) = 100*(level+1)`, so lvl 0→1 needs 10s of
continuous sprinting today). Bump the flat rate — extract the magic `10` into a named
constant (e.g. `RUNNING_XP_PER_SEC`) near the top of `MainScene.ts` and raise it to
**~20**. Pure numeric tune, no curve/formula changes, easy to re-tune again later.

### A2 — Ctrl+Click to unequip armor
Standing pattern (per memory: every double-click quick-move gesture also gets a
Ctrl+Click alias) — this is the one remaining gesture that doesn't have it yet.
- `src/ui/InventoryMenu.ts` (~line 279-285): the armor-slot `pointerdown` handler
  currently checks right-click (context menu) then left-click (`beginArmorDrag`). Add a
  Ctrl+Click branch between them: if `pointer.event` has `ctrlKey` and the slot is
  occupied, call a new dep `deps.unequipArmorSlot(slot.id)` and return (skip the drag).
  Inline the same 2-line `ctrlKey` check `MainScene.isCtrlClick()` already uses
  (`MainScene.ts:761-763`) — this file doesn't currently import any shared pointer
  helper, and one small duplicated check is simpler than introducing a new shared util
  for a single extra call site.
- `InventoryMenuDeps` (`InventoryMenu.ts:27`+) gains `unequipArmorSlot: (slot:
  EquipSlot) => void`, wired in `MainScene.ts` (~line 2934, alongside the existing
  `beginArmorDrag`/`openArmorContextMenu` wiring) as `unequipArmorSlot: (slot) =>
  this.unequipArmorSlot(slot)` — reuses the existing private `unequipArmorSlot(slot,
  toIndex?)` (`MainScene.ts:3000`) with no `toIndex`, identical to the context menu's
  "Unequip" row (`MainScene.ts:3041`).

### A3 — Clicking a placed Workbench opens the crafting menu
Currently a placed Workbench has zero hover/interact behavior (only proximity-gates
crafting via `isNearWorkbench`) — unlike the Drying Rack/chest, which use a
`hoveredRack`/`hoveredShack` pattern (`MainScene.ts` hover loop ~1764-1837,
`tryInteract()` ~1941-1962) to open their menus on click.
- Add a `hoveredWorkbench: Phaser.GameObjects.Image | null` field, populated in the
  same hover-detection pass by scanning `this.placedObjects.filter(o =>
  o.getData("itemKey") === "workbench")` for the closest one within `Math.max
  (displayWidth, displayHeight)/2 + 6` of the pointer — mirrors the Drying Rack loop's
  radius math exactly, just sourced from `placedObjects` instead of a dedicated array
  (no new parallel array needed, unlike `dryingRacks`/`gremlinShacks`, since Workbench
  has no per-instance state to track beyond what `placedObjects` already carries).
- New `promptForWorkbench(image)`: same `REACH`-gated shape as `promptForRack`/
  `promptForShack`, returns `"[LMB] Craft"` when in reach.
- `tryInteract()`: new branch — `if (this.hoveredWorkbench) { if (inReach)
  this.toggleCombinedMenu(); }`. Reuses the existing `toggleCombinedMenu()`
  (`MainScene.ts:2394`) verbatim — same function Tab already calls — so clicking the
  workbench a second time while the menu's open closes it, consistent with Tab's own
  toggle behavior.

### A4 — Smart scroll-wheel cycling (skip empty slots)
`cycleHotbar(dir)` (`MainScene.ts:650-660`) currently steps exactly one slot per wheel
tick regardless of contents. Rewrite to step up to a full lap looking for the first
occupied slot (`this.hotbar.get(slot) !== null`), respecting the existing
`wheelSpansBothRows` toggle's range (full 18 slots vs. current-row-only 9):
```ts
private cycleHotbar(dir: number): void {
  const rowStart = this.wheelSpansBothRows
    ? 0
    : this.hotbar.selected() < ROW1_COUNT ? 0 : ROW1_COUNT;
  const size = this.wheelSpansBothRows ? this.hotbar.size : ROW1_COUNT;
  let next = this.hotbar.selected();
  for (let i = 0; i < size; i++) {
    next = rowStart + (((next - rowStart) + dir + size) % size);
    if (this.hotbar.get(next) !== null) break;
  }
  this.setHotbarSelection(next);
}
```
If every slot in range is empty, the loop completes a full lap and lands back where it
started (harmless no-op) — no infinite loop risk since it's bounded to `size`
iterations.

### A5 — Boss Altar minimum distance from world center
`pickAltarPosition()` (`MainScene.ts:1656`) already calls `pickSpawnPoint(rng,
"forest", ALTAR_CLEAR_RADIUS, true)`, and `pickSpawnPoint` already rejects any
candidate within `clearRadius` of world center (`MainScene.ts:1284`) — so the
mechanism the user is asking for already exists, it's just tuned too small.
`ALTAR_CLEAR_RADIUS` is currently an inline local `900` inside `pickAltarPosition()`.
Promote it to a named module-level constant and raise it to **1400** (world is
3584x2688, half-diagonal ≈2240, so 1400 is a meaningfully bigger clearance while still
leaving the 200-attempt fallback loop enough forest-zone area to find a valid point).
No other logic changes needed.

### A6 — Boss charge attack: reliable damage during travel / on contact
`GremlinKing.checkPlayerHit()` (`GremlinKing.ts:344-369`) is already called every
frame during the `executing` state from `MainScene.ts:2138` (confirmed via research —
damage-during-travel already fires mechanically), so this isn't a missing-check bug.
The real gap: `CHARGE_HIT_RADIUS = 34` (`GremlinKing.ts:39`) is a flat constant that
never accounts for `BOSS_SCALE = 2.4` (the boss's visual sprite is scaled up but the
hit-check radius isn't) — same class of bug the earlier `MainScene.enemyReach()` fix
addressed for normal attack/prompt reach, just not applied to this boss's own charge
math. Fix: `const CHARGE_HIT_RADIUS = 34 * BOSS_SCALE;` (≈82px) — a one-line change
(`BOSS_SCALE` is already declared above it in the same file, so this is a legal forward
reference at module-eval order). At `CHARGE_SPEED = 340px/s` (~5.7px/frame at 60fps),
82px is comfortably larger than one frame's travel, so no swept/continuous check is
needed beyond the per-frame point-distance check that already runs. `CLEAVE_RANGE`/
`SLAM_RADIUS` aren't touched — only charge was flagged, and changing untested numbers
elsewhere risks regressing tuning nobody complained about.

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit` after all six changes.
2. `preview_start` (config `dev`) + `preview_eval`:
   - Force `skills.addXp("running", ...)` and confirm the new rate reaches Running lvl
     1 in ~5s of simulated sprint time (was ~10s).
   - Simulate a Ctrl+Click (`fakePointer.event.ctrlKey = true`) on an occupied armor
     slot and confirm `equipment.get(slot)` becomes `null` and the item lands in the
     backpack.
   - Teleport the player next to a placed Workbench, call the hover/interact path, and
     confirm `inventoryMenu.isOpen()` / `craftingMenu.isOpen()` both become true.
   - Populate a hotbar with gaps (e.g. slots 0, 3, 7 filled) and call `cycleHotbar(1)`
     repeatedly from slot 0, asserting it visits only 3/7/0 in order.
   - Call `pickAltarPosition()` a few times with different session seeds and confirm
     every result is ≥1400px from world center.
   - Force the Gremlin King into a charge, position the player at ~60-80px offset from
     the boss during `executing`, and confirm `checkPlayerHit()` now returns a hit
     where it previously returned `null`.
3. `preview_screenshot` to confirm nothing visually broke (workbench hover doesn't
   double-highlight with rack/shack, hotbar cycling doesn't desync the visual
   selection highlight).
