# Status

Last updated: 2026-07-06

## Where things stand

Core loop works: move (WASD/arrows), gather (branches/rocks free; trees/boulders
need the right tool kind equipped), craft (T), manage inventory/hotbar (Tab,
1-9, scroll wheel), equip tools via the hotbar. Recipe discovery is gated by
"have you picked up the ingredients" + skill level; unlocks announce themselves
via a toast + persistent event log (bottom-right, collapsible).

### Just finished: Milestone 1 of the inventory-overhaul plan

Plan file: `.claude/plans/bug-i-can-drag-twinkling-engelbart.md` (3 milestones;
M1 done, M2/M3 not started).

Replaced the old derived-list item model (`Inventory` counts + `ownedTools`
Set + `craftedItemCounts` Map) with a single unified slot-based model:

- **`src/systems/ItemContainer.ts`** (new) — fixed-size array of `{key, count}`
  stacks. `add`/`hasRoomFor`/`count`/`removeCount`/`findAssignable`, plus the
  free function `moveSlot(src, si, dst, di)` that merges-or-swaps. This one
  primitive backs every drag, rearrange, and hotbar assignment.
- **Backpack** (`MainScene.backpack`) and **Hotbar** (`Hotbar.container`) are
  each an `ItemContainer`. Resources (wood/stone/leather) are now regular
  stackable items living in the grid (max 99), not a separate counter.
- **`Items.ts`** — every item def now carries `maxStack` (99, or 1 for
  tools/weapons) and `hotbarable` (false for shishkabob/campfire).
- Drag is scene-owned (`MainScene.beginItemDrag/resolveItemDrag`), not
  per-widget — this is what lets items move backpack<->hotbar and rearrange
  within either. Right-click quick-moves via `quickMoveItem`.
- Mouse wheel cycles the hotbar 1-9 (wraps both directions) unless the pointer
  is over the event log, which scrolls its own history instead
  (`EventLogUI.isPointerOver`).

This fixed both reported bugs (item duplicating into multiple slots on
drag/right-click; crafting a 2nd tool eating resources with no result) as a
side effect of giving every item a single home slot instead of a derived
count.

**Verified via `preview_eval`** (see the session transcript) — direct
scene-method calls, not screenshots, because the preview tab was backgrounded
for most of this session and Phaser's render loop pauses when hidden
(`sys.settings.status` stuck at `INIT`). Had to force-boot MainScene once via
`game.scene.bootScene(scene)` to get past a stuck queued scene-start; that's
an environment quirk, not a code bug — confirmed by no console errors and the
scene running fine afterward. Screenshots never rendered this session; a
fresh, foregrounded tab should not need the same workaround.

### Up next

**Milestone 2** (see plan file): resource node health/multi-hit, tool damage,
swing animation + node decay/shake per hit. Then **Milestone 3**: loose
world drops with stack consolidation + magnet auto-pickup toggled by `V`.

### Known rough edges / deferred (see plan's "Out of scope" section)

Carry weight, tool durability, craft-quantity selector, stacking exceptions
beyond durability — all intentionally deferred, not forgotten.
