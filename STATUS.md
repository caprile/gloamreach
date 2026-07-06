# Status

Last updated: 2026-07-06

## Where things stand

Core loop works: move (WASD/arrows), gather (branches/rocks free; trees/boulders
need the right tool kind equipped and now take multiple hits, see below), craft
(T), manage inventory/hotbar (Tab, 1-9, scroll wheel), equip tools via the
hotbar. Recipe discovery is gated by "have you picked up the ingredients" +
skill level; unlocks announce themselves via a toast + persistent event log
(bottom-right, collapsible). Placeable items (currently just the campfire)
skip the backpack entirely — crafting one enters a placement mode instead.

### Just finished: Move speed halved + tool hit-rate cooldown

Two small follow-ups requested right after M2 landed (M2's multi-hit change
made LMB-spam farming worse, since nothing capped how fast repeated hits
could land):

- **`Player.ts`**: `SPEED` halved (190 → 95 px/s) — movement felt too fast.
- **Tool hit cooldown**: `toolCooldownMs(tool)` (`src/entities/ResourceNode.ts`),
  same `Record<ToolType, number>` pattern as `toolDamage`/`toolKind`
  (`stone_axe`/`stone_pickaxe` both `500`ms for now). `MainScene.tryInteract()`
  tracks `lastToolHitAt` (via `this.time.now`) and bails out silently (no
  swing, no `takeHit`) if a chop/mine attempt comes in before the cooldown
  elapses — spamming LMB now can't out-farm the tool's swing rate. Pickups are
  unaffected (single-click, no cooldown, same as before).
- This is the first piece of "attack speed" as a per-tool/weapon concept;
  future tiers/weapons can tune their own cooldown independently, and this is
  the hook combat (roadmap item 4) will reuse for weapon attack speed.

Verified via `preview_eval`: first hit registers, an immediate second click on
the same node is blocked (health unchanged), and after waiting past the
cooldown window a hit lands again. Type-check clean, no console errors.

### Previously: Resource node health / multi-hit (Milestone 2)

Plan file: `.claude/plans/radiant-gliding-seal.md`.

Trees and boulders now take 3 hits to fell instead of one:

- **`ResourceNode`** (`src/entities/ResourceNode.ts`) gained `health`/
  `maxHealth` (set via a new `health` field on `ResourceNodeConfig`) and a
  `takeHit(damage)` method — decrements health, plays shake+tint feedback,
  returns `true` only once health hits 0. The resource `amount` is awarded
  **only on the depleting hit**, not per-hit — no partial-yield/overflow
  logic needed, matches loose-drops still being deferred to M3.
- **Tool damage** is a new `toolDamage(tool)` function next to the existing
  `toolKind()`/`requiredKind()` pattern, backed by a `Record<ToolType, number>`
  (`stone_axe`/`stone_pickaxe` both deal `1` for now) — future higher tiers
  return a bigger number and fell nodes in fewer hits without any node-data
  changes.
- **Hit feedback** lives entirely in `ResourceNode.playHitFeedback()`: a quick
  side-to-side shake tween plus a tint interpolated from white toward a
  darker "damaged" shade as health drops — the first shake/tint-style effect
  in the codebase (tween conventions follow `EventLogUI.ts`'s established
  style: short durations, named eases, cleanup via callbacks).
- **`Player.playSwing()`** (`src/entities/Player.ts`) is a quick rotate-punch
  tween (angle 0→25→0) played on every successful chop/mine hit — a stand-in
  for a real swing animation since there's no facing-direction or
  weapon-sprite system yet; kills any in-flight swing tween first so rapid
  clicks can't leave the player stuck mid-rotation.
- Pickups (branch/rock) are untouched — `health: 1`, but they never go
  through `takeHit`, so behavior is identical to before.
- Trees/boulders that survive a hit stay in `this.nodes` and keep showing
  their hover prompt; nothing is removed/credited until the depleting hit.

Verified via `preview_eval` (health decrementing per hit, resource awarded
only on the 3rd/depleting hit for both chop and mine, node correctly removed
from `nodes` only when depleted, rapid back-to-back hits leaving no stuck
tween/angle state) plus a `preview_screenshot` for the tint darkening. Type-
check clean, no console errors.

### Previously: Placement mode for build/placeable items

Plan file: `.claude/plans/ancient-painting-petal.md`.

Items flagged `placeable: true` in `Items.ts` (currently just `campfire`) no
longer land in the backpack when crafted. Instead:

- The crafting menu's button reads **"Place"** instead of "Craft" for these
  recipes (`isPlaceableRecipe()` in `Recipes.ts`, checked in `CraftingMenu.ts`).
  Clicking it closes the crafting menu and enters **placement mode**
  (`MainScene.startPlacement`) — no cost is deducted yet.
- A semi-transparent ghost preview follows the cursor, clamped to
  `PLACEMENT_RADIUS = REACH * 1.25` (80px) of the player (recomputed live each
  frame, so walking repositions the radius). A small hint —
  `[LMB] Place <item>   [RMB] Cancel` — shows under the top-left controls
  line (`placementHintText`, 12px, `(12, 30)` — deliberately NOT the shared
  bottom-right gather-prompt text, and deliberately not overlapping the
  hotbar or the `[T] Craft` tab).
- **LMB** (`attemptPlaceObject`) deducts the recipe cost only at that moment,
  spawns a plain world image at the ghost's position, and **re-arms**
  placement mode immediately so the next one can be placed without reopening
  the crafting menu — this loop is the "ask to place another" behavior,
  expressed as the persisting prompt rather than a separate confirm dialog.
  Running out of materials mid-loop auto-cancels with an event-log message.
- **RMB**, **Escape**, or **Tab** cancel placement mode outright — free,
  since nothing is spent until a successful LMB.
- A same-click double-fire bug (Phaser fires both the "Place" button's own
  `pointerdown` and the scene-wide generic `pointerdown` for one click, which
  was placing the object right where "Place" was clicked) is fixed via a
  one-shot `suppressNextPointerdown` flag consumed by the scene's global
  pointerdown handler.
- No loose-world-drop system was needed for this — since materials are only
  spent on a successful LMB, a cancelled placement has nothing to destroy.
  That concept is still deferred to Milestone 3 (or to whenever destroying
  *already-placed* build pieces becomes a feature).
- Placed objects are currently just visual (`this.add.image`, no physics
  body, no interaction) — intentionally minimal; a real placed-object entity
  can come later alongside the destroy-for-pieces feature.

Verified via `preview_eval` (radius clamping, cost-only-on-LMB, free RMB
cancel, Escape/Tab cancelling instead of opening menus, the double-click fix
via simulated real Phaser pointer events, and clicking "Place" through the
actual crafting-menu UI). Type-check clean, no console errors.

### Previously: Milestone 1 of the inventory-overhaul plan, plus a UI polish pass

Plan file: `.claude/plans/bug-i-can-drag-twinkling-engelbart.md` (3 milestones;
M1 done, M2/M3 not started).

**M1** replaced the old derived-list item model (`Inventory` counts + `ownedTools`
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

**Then a follow-up UI polish session** cleaned up rough edges left by M1:

- Removed the top-left `Wood/Stone/Tool` HUD text (redundant once items live
  visibly in the grid/hotbar) and moved the "Move: WASD..." controls line up
  to `(12, 10)` now that nothing sits above it.
- **`src/ui/Tooltip.ts`** (new) — extracted the item-info popup (name,
  description, stats) that `InventoryMenu` already had into a shared class
  with two placement modes: `"right"` (flips left near the screen edge — used
  by the backpack grid) and `"above"` (opens upward, centered — used by the
  hotbar, which sits at the very bottom of the screen). `HotbarUI` now shows
  the same hover tooltip the backpack grid does.
- **`InventoryMenu`** reworked into a horizontal layout — backpack grid grown
  from 5x4 (20 slots) to **6x6 (36 slots)** on the left, with the 3x3
  equipment grid repositioned to its right (was stacked above it), using the
  vertical space freed up by that move.
- **Crafting menu** recipe rows now show the item's icon next to its name
  (`[icon] Stone Axe`). `outputKey(recipe)` (tool/itemId -> item key) moved
  from `MainScene.ts` into `Recipes.ts` as a shared export so both
  `MainScene` and `CraftingMenu` use one implementation.
- **Recipe-unlock toasts** redesigned: previously a center-screen toast shared
  with level-up/info messages; now recipe unlocks get their own small
  icon+text card that slides in from the right edge, lands in a stack
  top-right (below the `[T] Craft` button, clear of the bottom-right event
  log), holds, then fades. Multiple unlocks queue and stagger in one at a
  time (~200ms apart) instead of popping in simultaneously. Level-up/info
  toasts are unchanged (still center-screen via `EventLogUI.showToast`).

**Verified via `preview_eval` + `preview_screenshot`** — direct scene-method
calls to inspect state precisely (container/text object positions, contents,
tween state via an in-page `await new Promise(setTimeout...)` before
inspecting), plus visual screenshots for layout confirmation. Type-check
clean throughout. No console errors.

### Up next

Back to the inventory-overhaul roadmap: **Milestone 3** (loose world drops
with stack consolidation + magnet auto-pickup — plan file
`.claude/plans/bug-i-can-drag-twinkling-engelbart.md`).

Per `CLAUDE.md` convention (one milestone/feature per session), M3 should
start in a fresh chat session rather than continuing this one.

**Beyond M3**, three more feature requests were raised (2026-07-06) and given
a rough sequencing — none started yet:

- **Stamina** (sprint/jump/tool-swing cost, max pool + regen) — already sat at
  roadmap item 3 ("Stamina, sprint, jump," right after loose drops/magnet in
  `CLAUDE.md`'s Roadmap section); no change to its position. It depends on the
  hit-rate-cooldown concept above existing first (stamina cost per swing needs
  a swing-rate to hook a cost into), which is now done.
- **Equipped item visible on the player sprite** — deliberately deferred to
  sit alongside **Combat** (roadmap item 4). `Player` is currently a static
  sprite with no facing direction or weapon-attachment system; M2's "swing" is
  a placeholder rotate tween, not a real animation. Building a real
  facing/weapon-visual system once (for combat) and reusing it for tools
  avoids doing it twice.
- Tool/weapon attack-speed values (`TOOL_COOLDOWN_MS` in
  `src/entities/ResourceNode.ts`) will need a weapon-side equivalent when
  Combat is built — same pattern, different table.

### Known rough edges / deferred (see plan's "Out of scope" section)

Carry weight, tool durability, craft-quantity selector, stacking exceptions
beyond durability — all intentionally deferred, not forgotten. Placed
objects (campfire) have no collision/overlap checks and can't be destroyed
yet — deferred until a destroy-for-pieces feature exists, at which point the
loose-world-drop system (Milestone 3) will be needed for real.
